---
name: cli-go-cobra-wails
description: Scaffold or extend hybrid Linux applications that run primarily as a CLI (Go + Cobra) and open a native GUI window (Wails + Vue 3 + TypeScript) only for specific commands like `config` or `setup`. Use this whenever the user asks to create a new Cobra CLI that also needs an optional graphical window, add a command to an existing Go/Cobra/Wails project, decide whether a new subcommand should be CLI or GUI, embed a Vue frontend into a single Go binary, or wire Go business logic so both the terminal and the GUI call the same code without duplication. Also use it when the user names the stack directly or asks for a single-file distribution build for a Linux CLI/GUI hybrid.
---

# Go + Cobra + Wails: CLI-first, GUI-on-demand

## The one rule everything else follows

> **CLI-first, GUI-on-demand.** Cobra is the entrypoint. Wails is a library some commands happen to call. Business logic lives in Go packages that both sides use identically.

Concretely: `mycom init`, `mycom run`, `mycom status` must never import anything from the `gui` package, never initialize Wails, never create a window — even indirectly. Only commands that are explicitly graphical (e.g. `mycom config`) import `gui` and call into Wails. Trace imports before writing code if you're ever unsure whether something could pull Wails into a CLI-only command's build path.

This produces a binary that *feels* like a professional CLI that can incidentally open a window — never a desktop app with bolted-on flags. Let that framing drive naming, file layout, and how much frontend polish is warranted.

## Stack

Go · Cobra · Wails v2 · Vue 3 + TypeScript · Vite · plain modern CSS · TOML config via `github.com/BurntSushi/toml` (the stdlib has no TOML support) + `os.UserConfigDir()` (stdlib, already XDG-aware on Linux). Don't substitute pieces of this or add other dependencies without a concrete reason — `references/conventions.md` has the full reasoning.

**Before writing any Wails-specific code** — the `main`/`gui` embed pattern, `wails.Run` options, `wails.json` fields, `wails dev`/`wails build` flags and flows, Linux package names, Go↔TS binding behavior — read `references/wails-facts.md`. It was checked against the real Wails source and docs (not recalled from general familiarity), because these APIs and flags genuinely shift across Wails versions and are easy to misremember or invent.

## How this skill is organized

This SKILL.md is the router. Everything else lives in `references/` (read as needed) and `assets/templates/` (copyable starting files, not prose):

| File | Read it for |
|---|---|
| `references/architecture.md` | The full directory layout, what each layer owns/must-not-contain, XDG config-path conventions, TOML config shape |
| `references/conventions.md` | Cobra command shape, error wrapping, `context.Context` usage, testing approach, dependency policy, Go style |
| `references/wails-facts.md` | Verified Wails v2 facts: scaffolding, `wails.json`, embedding, the Cobra+Wails composition pattern, `wails dev -appargs`, build output, Linux WebKitGTK/GTK3 dependencies, binding codegen caveats |
| `references/gui-design.md` | What the GUI should look/feel like (plain Vue + CSS, dark mode via CSS variables, no UI framework by default) |
| `references/workflow-new-project.md` | Step-by-step for scaffolding a brand-new project |
| `references/workflow-add-command.md` | How to decide CLI vs. GUI vs. hybrid for a new command, and the steps for adding each kind |
| `assets/templates/*` | Ready-to-copy files: `main.go`, `cmd_*.go`, `gui_app.go`, `gui_bindings.go`, `internal_config.go`, `internal_storage.go`, `wails.json`, `Makefile`, `frontend_*` — rename `mycom`/module paths when copying into a real project |

Don't restate the content of these files inline when you can point at them — that's the point of splitting them out.

## Picking the right workflow

- **New project from scratch** → `references/workflow-new-project.md`. It sequences things so CLI commands work and are verified *before* Wails enters the picture at all.
- **Adding a command to an existing project** → `references/workflow-add-command.md`. It starts with classifying the command (CLI/GUI/hybrid) before any code gets written — don't guess from the command name alone; e.g. `install` sounds GUI-adjacent but is almost always CLI because it has to work headless over SSH.
- **Modifying a project that already has its own structure** → adapt to what's there. The directory names in `architecture.md` (`internal/`, `gui/`) are a sensible default, not a requirement. Match the existing project's naming, package boundaries, and config format; don't restructure a working project to match this skill's example layout just for consistency's sake. The CLI-first/GUI-on-demand *principle* travels regardless of directory names — that's the part not to compromise on.

## Verification checklist (run this, don't just assert it)

After scaffolding or modifying commands, actually check — both `workflow-new-project.md` and `workflow-add-command.md` end with a version of this, repeated here because it's the thing most likely to get skipped under time pressure:

- [ ] Each CLI-only command (`init`, `run`, `status`, ...) opens no window — verify by reading its file's imports (no `gui` import) and by actually running it.
- [ ] The GUI command (`config`, or whichever) does open a window when run for real.
- [ ] `make build` (or `wails build -clean -trimpath`) produces exactly one file at `dist/<binary>`.
- [ ] `go test ./...` passes, and the `internal/` package tests run without starting Wails or needing a display.
- [ ] `gofmt -l .` and `go vet ./...` are clean.

## Teach, don't just generate

When you scaffold or modify this kind of project:

- Say in a sentence or two *why* a non-obvious choice was made (e.g. "the GUI command's Go package is `gui`, not `main`, so the generated TS import path is `wailsjs/go/gui/App`, and its `Config` type has had version-dependent codegen bugs — see `wails-facts.md` — so the template writes its own small TS interface instead of trusting it blindly").
- Point at the specific file to edit for a given responsibility rather than pasting the whole tree again.
- Prefer modifying what exists over regenerating it.
- Don't scaffold empty `gui/` or `internal/<domain>/` packages "for later" — add them when a command actually needs them.
