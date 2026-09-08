# Deciding CLI vs GUI vs hybrid when adding a command

When asked to add a new subcommand, decide its kind *before* writing any code. This decision
determines which directories the new code touches.

## Decision guide

1. **Default to CLI.** Most subcommands should be pure CLI: they print structured or
   human-readable output and exit. `status`, `version`, `logs`, `doctor`, `list`, `uninstall`,
   `install` (usually), `run`, `init` — all CLI by default, per the spec's explicit examples.

2. **GUI is for configuration/visual surfaces where a form or dashboard genuinely beats flags
   and prompts.** Ask: would this command's job realistically require multiple related fields,
   checkboxes, live preview, or drag/drop/visual selection? `config`, `setup`, `dashboard` are
   the kind of thing that qualifies. A command that just reads/writes one or two scalar values
   is still better served by flags (`mycom config set theme dark`) than a window.

3. **Hybrid/ambiguous cases** — evaluate concretely instead of guessing:
   - `login` with OAuth: a browser-based OAuth flow (opening the system browser to an OAuth
     URL, then listening on localhost for the callback) is usually the right call, and that is
     *not* the same thing as opening a Wails window — don't reach for Wails just because a
     command needs "some UI." Only use a Wails window if the login flow needs an actual local
     form (e.g. entering a self-hosted server URL plus credentials with validation).
   - A command that's "CLI most of the time, GUI if run without enough flags to be
     non-interactive" (e.g. `mycom config` with no flags opens the GUI, but
     `mycom config set provider claude` stays pure CLI) is a legitimate hybrid pattern — check
     `len(args)`/flags in `RunE` and branch between calling `internal/` directly (CLI path) or
     `gui.RunConfigGUI()` (GUI path). Keep both paths calling the *same* `internal/` service.

4. When genuinely unsure, ask the user rather than guessing — this is a real product decision
   (does this feel more like `git commit -m` or more like a settings panel?), not a technical
   one you can infer purely from the codebase.

**A quick test that cuts through most of the ambiguity:** would this command still make sense
run over SSH with no `$DISPLAY`? If yes, it's CLI. If the honest answer is "no, someone would
need to be sitting at the machine with a screen anyway," a GUI isn't a downgrade to the
experience for that command — it's appropriate.

## Adding a CLI-only command

1. Add `internal/<domain>/<thing>.go` (or extend an existing `internal/` package) with the
   actual logic, if it doesn't already exist. Write it so it's testable without Cobra.
2. Add `cmd/<name>.go`: construct the `*cobra.Command`, wire flags, call the `internal/`
   function, print the result. Follow the shape in `conventions.md`.
3. Register the new command with the root command (`rootCmd.AddCommand(newXCommand())`).
4. Add a test for the `internal/` logic if it has any real branching.
5. Confirm `mycom <name> --help` reads well and `mycom <name>` does the right thing — and
   verify no `gui` package is imported anywhere in the new files.

## Adding a GUI (or hybrid) command

1. Make sure the underlying capability exists as `internal/` service functions first — the
   GUI should never be the only way to perform the operation if a CLI equivalent is remotely
   reasonable (e.g. `mycom config set provider claude` should still work even though
   `mycom config` also opens a GUI for the same job, unless the user explicitly says the
   feature is GUI-only).
2. Add/extend the bound struct in `gui/bindings.go` with thin methods that call `internal/`
   — see `wails-facts.md` for the current binding mechanism.
3. Add/extend `gui/app.go` with a clearly named exported function (conceptually
   `RunConfigGUI(assets embed.FS) error`) that constructs and runs the Wails application. This
   is the single place `wails.Run` is called for this feature. It takes the embedded frontend
   as a parameter rather than embedding it itself — `gui/` and `frontend/` are sibling
   directories, and `//go:embed` cannot use `..` to reach a sibling (verified — see
   `wails-facts.md` fact #4); the embed directive has to live in `main.go` instead and get
   threaded down through `cmd.Execute(assets)`.
4. Add the Vue view/component(s) under `frontend/src/pages/` or `frontend/src/components/`.
   Forms, visual state, and calls into the bound Go methods live here — no business logic.
5. Add `cmd/<name>.go` whose `RunE` calls `gui.RunConfigGUI(assets)` and nothing else
   business-logic related.
6. Verify: running the new command opens the window; running any *other* command does not
   (grep the other command files for a `gui` import — there should be none); closing the
   window returns control to the shell with exit code 0 and no leftover process.

## Modifying an existing project

If the project already has a working (even if different) structure, adapt to it — don't
impose the layout from `architecture.md` wholesale on an established codebase. Match existing
naming, existing package boundaries, and existing config format unless the user asks for a
restructure. Prefer the smallest edit that accomplishes the request over a rewrite.
