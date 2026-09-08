---
name: wails-facts
description: Verified, source-checked facts about the current stable Wails (v2) API, project scaffold, build system, and Linux runtime dependencies — consult before writing any Wails-specific code so nothing gets invented.
---

# Verified Wails v2 Facts

## Contents

- [Version boundary](#1-version-use-wails-v2-not-v3)
- [Scaffolding](#2-scaffolding-a-project)
- [Configuration](#3-wailsjson--exact-fields-from-the-real-v2140-template)
- [Frontend embedding](#4-frontend-embedding--the-exact-goembed-pattern)
- [Frontend bindings](#5-go--frontend-bindings)
- [Cobra integration](#6-running-wails-from-inside-a-cobra-command--confirmed-pattern)
- [Development](#7-wails-dev-and-cobra-the--appargs-flag)
- [Builds](#8-wails-build--output-and-flags)
- [Linux dependencies](#9-linux-runtime-dependencies--do-not-claim-a-static-binary)
- [Window lifecycle](#10-window-lifecycle-basics)
- [Re-verification](#how-to-re-verify-if-something-looks-stale)

These facts were confirmed against the official Wails docs, the real `vue-ts` template source in `wailsapp/wails` (tag `v2.14.0`), and GitHub issues/discussions — not recalled from memory. If a project you're working on pins a different Wails version, diff its scaffold against what's below before assuming these APIs still apply; re-verify anything version-sensitive (see "How to re-verify" at the end).

## 1. Version: use Wails v2, not v3

This skill targets Wails v2 and its declarative `wails.Run(&options.App{...})` API. Do not apply these APIs to a Wails v3 project. Verify the project's pinned Wails version and current upstream release status before scaffolding or upgrading.

**Default to v2 for anything the user will run in production.** Only use v3 if the user explicitly asks for it or the ecosystem has clearly moved past beta by the time you're reading this — check `gh api repos/wailsapp/wails/tags --jq '.[].name' | grep -v webview2` for the latest tags before deciding, since this shifts over time.

Source: v3.wails.io/blog/wails-v3-beta/, v3.wails.io/whats-new/, GitHub tags.

## 2. Scaffolding a project

```bash
wails init -n <project-name> -t vue-ts
```

`-n` sets the project name, `-t vue-ts` selects the official Vue 3 + Vite + TypeScript template (`template.json` names it "Vue + Vite (Typescript)"). This is the correct template name — don't substitute `vue` (that's the JS-only variant) or invent a `vue3-ts` name.

Minimum Go version in the scaffolded `go.mod`: `go 1.23.0`.

## 3. `wails.json` — exact fields (from the real v2.14.0 template)

```json
{
  "$schema": "https://wails.io/schemas/config.v2.json",
  "name": "<project-name>",
  "outputfilename": "<binary-name>",
  "frontend:install": "npm install",
  "frontend:build": "npm run build",
  "frontend:dev:watcher": "npm run dev",
  "frontend:dev:serverUrl": "auto",
  "author": { "name": "...", "email": "..." }
}
```

`outputfilename` is what ends up in `build/bin/`. `wailsjsdir` is an optional field (defaults to `frontend/wailsjs` if omitted — confirmed by the scaffolded template placing generated bindings there without setting the field explicitly).

## 4. Frontend embedding — the exact `go:embed` pattern

The scaffolded `main.go` (verbatim from the template, minus comments):

```go
package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:  "myapp",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
```

Key points:
- `//go:embed all:frontend/dist` embeds the **built** Vite output (`npm run build` output, not `src/`) directly into the Go binary at compile time.
- `wails.Run(...)` is an ordinary blocking Go function call — it returns an `error` once the window closes. **This is what lets a Cobra `RunE` call it and return control afterward** (see fact #6).
- `Bind: []interface{}{app}` is how Go struct instances get exposed to the frontend (see fact #5).

**Verified constraint that breaks the naive version of this skill's own layout**: `//go:embed`
patterns cannot contain `..` path elements — a directive can only reach into the directory
tree *below* the file it's written in. Confirmed by actually compiling it:
`//go:embed all:../frontend/dist` written in a file under `gui/` (a sibling of `frontend/`,
not an ancestor) fails with `pattern all:../frontend/dist: invalid pattern syntax`. So the
`gui/app.go` this skill uses (which keeps `gui/` free of anything except the Wails call and
bindings) **cannot** hold the `//go:embed` directive itself. The fix used throughout this
skill's `assets/templates/`: the directive stays in `main.go` (a real ancestor of `frontend/dist`,
since both are direct children of the module root), and `main.go` passes the resulting
`embed.FS` down through `cmd.Execute(assets)` → `newConfigCommand(assets)` →
`gui.RunConfigGUI(assets)`. `main.go` and `cmd/config.go` end up importing the stdlib `"embed"`
package as a result, but neither imports `github.com/wailsapp/wails/v2` — the import-boundary
guarantee ("only `gui/` imports Wails") still holds; only the *asset bytes* travel through
`main`/`cmd`, not any Wails machinery. See `assets/templates/main.go`, `assets/templates/cmd_root.go`,
`assets/templates/cmd_config.go`, `assets/templates/gui_app.go` for the concrete wiring.

## 5. Go ↔ frontend bindings

Whatever struct instances you put in `Bind` get their **exported methods** turned into callable JS/TS functions, auto-generated into `wailsjsdir` (default `frontend/wailsjs/go/<package>/<StructName>/`).

The path segment is the **Go package name**, not always `main`. In the stock template the `App` struct lives in `package main`, so the frontend imports it as:

```ts
import {Greet} from '../../wailsjs/go/main/App'
```

**If you move the bindable struct into its own package (e.g. `package gui`, matching this skill's suggested `gui/` directory — see `assets/templates/gui_bindings.go`), the generated import path changes to `wailsjs/go/gui/App`.** This isn't a workaround, it's just how the generator names things — don't be surprised by it, and don't fight it by keeping the struct in `package main` just to get a shorter import.

Bindings regenerate on `wails dev` and `wails build`.

**Caveat on struct-type codegen**: method signatures (the callable functions) generate reliably, but the accompanying TypeScript *type* definitions for the Go structs those methods take/return (written to `wailsjs/go/models.ts` as `namespace <pkg> { class ... }`) have had real, version-dependent bugs — especially for nested structs (`wailsapp/wails` issues #1476, #2348, #2489). Don't write frontend code that blindly imports and trusts `wailsjs/go/models.ts` for a nested type without checking what actually got generated on that project's installed Wails version first; a small hand-written TS interface mirroring the Go struct is a reasonable, low-risk fallback when in doubt (see `assets/templates/frontend_App.vue` for this pattern in practice).

## 6. Running Wails from inside a Cobra command — confirmed pattern

This is officially just "call `wails.Run()` from wherever you want" — there's no special integration API, and that's the point: `wails.Run` is a plain function, not a required `main()` entrypoint. The concrete pattern this skill's templates use (accounting for the `go:embed`/`..` constraint in fact #4, which is why `assets` is a parameter rather than a package-level var declared in `gui/`):

```go
var configCmd = &cobra.Command{
    Use:   "config",
    Short: "Open configuration",
    RunE: func(cmd *cobra.Command, args []string) error {
        return gui.RunConfigGUI(assets) // assets threaded down from main.go
    },
}
```

where `gui.RunConfigGUI(assets)` wraps the `wails.Run(&options.App{...})` call shown in fact #4 and returns its `error`. Since `wails.Run` blocks until the window closes and then returns, **no special lifecycle handling is needed** in Cobra — `RunE` just waits for it like any other function call. Commands that never call this function never touch Wails, never link a window, and never show anything on screen.

There is a real GitHub discussion (`wailsapp/wails#3376`, "How to use wails as a service") confirming people successfully run Wails alongside other entrypoints/services in the same binary. There is no official "Cobra integration guide" from the Wails team — this composition works because both are just Go libraries, not because of a documented special case. Say this plainly if the user asks "is this supported" — it's supported in the sense that nothing prevents it and the community does it, not in the sense that there's a blessed tutorial for it.

## 7. `wails dev` and Cobra: the `-appargs` flag

**Critical gotcha**: `wails dev` builds and runs your binary itself. If your `main.go` wraps everything in a Cobra root command, `wails dev` launches your binary with **no arguments** by default — which means whatever your bare `mycom` (no subcommand) does is what runs, not your GUI subcommand.

To develop the GUI command with hot reload, pass the subcommand through explicitly:

```bash
wails dev -appargs "config"
```

`-appargs` takes a quoted, space-separated string of arguments that Wails passes to the underlying binary — confirmed via the Wails CLI reference and GitHub PR #1534 (which fixed an early limitation where flag-shaped appargs, e.g. `-appargs "config --verbose"`, weren't passed through correctly; recent versions handle this).

Practical implication for this skill: **Cobra's root command should never default into launching a GUI**, and dev workflows for a GUI command should be documented as `wails dev -appargs "<gui-subcommand>"`, not bare `wails dev`.

## 8. `wails build` — output and flags

Confirmed flags (Wails CLI reference):
- `-clean` — cleans the `build/bin` directory first
- `-platform <os>/<arch>` — comma-delimited target list, defaults to `GOOS`/`GOARCH`
- `-upx` — compress the final binary with `upx`
- `-trimpath` — strip filesystem paths from the binary
- `-o <filename>` — override the output filename
- `-tags <tags>` — pass Go build tags through (needed for the WebKitGTK ABI selection, see fact #9)

**Output path: `build/bin/<outputfilename>`.** This is a single native executable for the target platform with the frontend embedded via `go:embed` — there is no separate assets folder to ship alongside it. This skill's `make build` step should copy/rename that file into `dist/<binary-name>` for the user's preferred distribution layout (see fact #9 below for what "single executable" does and doesn't mean on Linux, and `assets/templates/Makefile` for the concrete copy step).

## 9. Linux runtime dependencies — do not claim a static binary

Wails on Linux links against **GTK3** and **WebKit2GTK** at runtime — these are system libraries, not embedded. The binary is a single *file*, but it is not dependency-free. Be explicit about this distinction whenever describing the build output.

There are two WebKit2GTK ABI generations in the wild, and this is a real source of build breakage across distros:

- **ABI 4.1** (current) — needed on newer distros (Ubuntu 24.04+, Debian 13, current Arch/Fedora/openSUSE). Requires the Go build tag **`-tags webkit2_41`** and, at build time, headers typically named `libwebkit2gtk-4.1-dev` (Debian/Ubuntu) or `webkit2gtk4.1`/`webkit2gtk-4.1` (Fedora/Arch naming varies).
- **ABI 4.0** (legacy) — the default Wails v2 build assumes this unless `-tags webkit2_41` is passed. Needed on older distros (Debian 11, Ubuntu 20.04, RHEL/CentOS/Alma/Rocky 8–9).

Package names genuinely vary by distro and package manager (apt, dnf, pacman, zypper, emerge, xbps, nixpkgs, eopkg all have Wails support docs) — **don't hardcode one distro's package name as universal**. When scaffolding a project, tell the user to run `wails doctor` to get the exact package list for their actual system, and mention the `-tags webkit2_41` build tag if `wails doctor` or a build failure signals an ABI mismatch. `libgtk-3-dev` (or the distro's GTK3 dev package) is required alongside whichever WebKit2GTK dev package matches the ABI.

At **runtime** (for end users, not just building), the equivalent non-dev runtime packages (e.g. `libgtk-3-0`, `libwebkit2gtk-4.1-0` or `libwebkit2gtk-4.0-37`) must be present on the target machine. This is the honest caveat to give users who ask for "a single static binary with zero dependencies" — it's one file, but Linux desktop distros overwhelmingly ship GTK3 already, so in practice it's rarely a real installation blocker, just not literally static.

## 10. Window lifecycle basics

`wails.Run()` blocks the calling goroutine until the window is closed (either by the user or via `runtime.Quit(ctx)` from Go, which can be hooked with `OnBeforeClose` for a confirmation prompt), then returns an `error`. This confirms the assumption this skill's architecture depends on: **a Cobra `RunE` can call the GUI-launch function synchronously and nothing else needs to run after it** — no goroutines, no manual process exit, no separate lifecycle hooks required for the basic "open a window, let the user interact, close it" flow. Known platform-specific rough edges exist around `OnBeforeClose`/`runtime.Quit` edge cases (see `wailsapp/wails` issues #926, #978, #1288) — irrelevant for a plain "open a form, save, close" GUI, worth flagging only if the user's GUI needs custom close-confirmation logic.

**From the frontend side**, closing/quitting is `Quit()` from the generated `wailsjs/runtime/runtime.js` (confirmed by reading that file directly from the `v2.14.0` `vue-ts` template scaffold — its exports are `LogPrint`, `LogTrace`/`Debug`/`Info`/`Warning`/`Error`/`Fatal`, the `Events*` family, the `Window*` family, `ScreenGetAll`, `BrowserOpenURL`, `Environment`, `Quit`, `Hide`, `Show`, and clipboard helpers). **There is no `WindowClose()` in this list, and plain browser `window.close()` is not part of Wails' API at all** — don't use it for a Cancel/close button; call `Quit()`, which triggers the same shutdown path `wails.Run()` is blocked on. `assets/templates/frontend_App.vue` does this correctly.

## How to re-verify if something looks stale

```bash
# Latest Wails v2 and v3 tags
gh api repos/wailsapp/wails/tags --paginate --jq '.[].name' | grep -v webview2 | head -20

# The real, current vue-ts scaffold (adjust the tag)
gh api repos/wailsapp/wails/contents/v2/pkg/templates/templates/vue-ts?ref=v2.14.0 --jq '.[].name'
```

Fetching `wails.io` docs pages directly with a generic HTTP fetch tool returns 403 (bot-blocked) as of this writing — use `gh` against the `wailsapp/wails` repo for source-of-truth scaffolds/code, and web search for narrative docs content.
