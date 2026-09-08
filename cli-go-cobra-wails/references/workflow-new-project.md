# Scaffolding a new project from scratch

Follow this order. Each step should leave the project in a working state before moving to the
next — don't write 12 files and then try to make them all compile together at the end.

1. **Name the binary.** Confirm the module/binary name with the user if not given (e.g.
   `astroctl`). Use it consistently: module path, `main.go` package doc, `wails.json` `name`,
   Makefile output path.

2. **Create the Go module.**
   ```bash
   mkdir <name> && cd <name>
   go mod init <module-path>   # e.g. github.com/user/<name>, or just <name> for a local-only project
   ```

3. **Add Cobra and set up `cmd/root.go` + `main.go`.**
   ```bash
   go get github.com/spf13/cobra@latest
   ```
   `main.go` should do nothing but call into `cmd`:
   ```go
   package main

   import "mycom/cmd"

   func main() {
       cmd.Execute()
   }
   ```
   `cmd/root.go` defines the root command, persistent flags (if any), and an `Execute()`
   function that runs the root command and turns a returned error into `os.Exit(1)`.

4. **Create the initial CLI-only commands** (`init`, `run`, `status`, or whatever the user
   asked for) as thin `cmd/*.go` files per `conventions.md`, each calling a stub or real
   `internal/` function.

5. **Create the core `internal/` services** the CLI commands actually need
   (`internal/config`, `internal/installer`, `internal/runner`, etc. — only the ones the
   requested commands actually require; don't pre-create empty packages for hypothetical
   future features).

6. **Integrate Wails** — only once you've confirmed which command(s) are GUI-designated.
   Follow the exact current commands/APIs in `wails-facts.md` (don't guess flags or file
   layout — that file was written from verified current docs). At a high level this means:
   running the Wails scaffolding tool to generate `wails.json` and a starter `frontend/`
   (Vue + TypeScript template), then relocating/adjusting so Wails' own generated `main.go`
   contents become the `gui/app.go` `RunConfigGUI(assets embed.FS) error` function instead of
   the program's real `main()` — except the `//go:embed` directive itself, which has to stay
   in the real `main.go` and get passed down as a parameter, because `//go:embed` can't reach
   the sibling `frontend/` directory from inside `gui/` (verified constraint, see
   `wails-facts.md` fact #4; `assets/templates/main.go` and `assets/templates/gui_app.go` show the split).

7. **Create the frontend** (Vue 3 + TypeScript via the Wails-scaffolded `frontend/`, or
   `npm create vite@latest -- --template vue-ts` if building it up manually). Keep it minimal
   at first — one view, one form — and expand once bindings work end-to-end.

8. **Connect bindings**: expose the `gui/bindings.go` struct's methods per the mechanism in
   `wails-facts.md`, regenerate/confirm the TypeScript binding stubs, and call one of them from
   Vue to prove the Go↔JS bridge works before building out the full form.

9. **Implement the GUI-designated command's real behavior** (e.g. `config`: load current
   config into the form, save on submit) — wired to the *same* `internal/config` used by the
   CLI, never a separate copy.

10. **Wire persistence** (`internal/config/storage.go`: XDG paths, TOML load/save) per
    `architecture.md`, if not already done in step 5.

11. **Set up the build**: a `Makefile` with `dev`, `build`, `test`, `clean` targets (see
    `assets/templates/Makefile`), where `make build` produces `dist/<name>` per `wails-facts.md`'s
    confirmed build command and output path.

12. **Run checks**: `gofmt -l .`, `go vet ./...`, `go test ./...`, then `make build`.

13. **Verify CLI commands don't open a GUI**: run each non-GUI command (`./dist/<name> init`,
    `run`, `status`, etc.) and confirm no window appears and the process behaves like a normal
    CLI tool (fast start, clean exit, no WebKitGTK/GTK initialization). A quick sanity check:
    `ldd dist/<name> | grep -i webkit` will show the binary links against WebKitGTK either way
    (that's normal — see `wails-facts.md` on why this doesn't mean every command opens a
    window), but running a non-GUI command should not actually create a window or block on an
    event loop.

14. **Verify the GUI command does open a GUI**: run `./dist/<name> config` (or whichever
    command is GUI-designated) and confirm the window opens, the form reflects the persisted
    config, and saving actually updates the config file the CLI also reads.

15. **Confirm the final artifact**: `dist/<name>` (or `build/bin/<name>`, per whatever
    `wails-facts.md` confirms as the real output path — reconcile the Makefile so the
    user-facing final location is `dist/<name>` even if the underlying `wails build` output
    path differs) is a single file that can be copied to another machine with the required
    system libraries (see `wails-facts.md`) and just run.

## Explaining as you go

At each major step, say in a sentence or two *why* — e.g. "gui/app.go is the only file that
imports Wails, so `init`/`run`/`status` never link in GUI behavior." Point at the specific
file the user would edit next for a given concern, rather than restating the whole
architecture every time. Don't generate large amounts of untouched boilerplate (e.g. don't
scaffold `frontend/src/components/`, `pages/` subfolders for components that don't exist yet)
— create files as they're actually needed.
