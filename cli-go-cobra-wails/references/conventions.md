# Go, Cobra, and testing conventions

## Contents

- [Priority order](#priority-order-apply-in-this-order-when-trade-offs-conflict)
- [Cobra commands](#cobra-command-shape)
- [Errors](#errors-preserve-context-dont-repeat-it)
- [Context](#context)
- [Testing](#testing)
- [Dependencies](#dependencies)
- [Formatting and checks](#formatting-and-checks)

## Priority order (apply in this order when trade-offs conflict)

1. simplicity
2. readability
3. maintainability
4. correct behavior
5. good CLI UX
6. good GUI UX
7. few dependencies
8. small binary size
9. performance

Never trade away clarity to save microseconds that don't matter. If a decision doesn't
obviously serve one of the top few priorities, prefer the simpler option.

## Cobra command shape

A command file in `cmd/` should be small: construct the `*cobra.Command`, declare flags,
validate/parse input, call exactly one function in `internal/`, and print/format the result.
No business logic in `RunE`.

```go
func newRunCommand() *cobra.Command {
    var verbose bool

    cmd := &cobra.Command{
        Use:   "run",
        Short: "Run the application",
        RunE: func(cmd *cobra.Command, args []string) error {
            return runner.Run(cmd.Context(), runner.Options{Verbose: verbose})
        },
    }

    cmd.Flags().BoolVar(&verbose, "verbose", false, "print detailed progress")
    return cmd
}
```

Guidelines:
- Use `Short` always; add `Long` only when it says something `Short` and `--help`'s flag list
  don't already convey.
- Use `Args` (e.g. `cobra.ExactArgs(1)`, `cobra.NoArgs`) to validate positional args instead of
  hand-rolling `len(args)` checks inside `RunE`.
- Local flags (`cmd.Flags()`) by default. Persistent flags (`cmd.PersistentFlags()`) only for
  things that are genuinely global across every subcommand (`--verbose`, `--config`,
  `--no-color`) — don't make a flag persistent just because it's convenient to declare once.
- Return `error` from `RunE`; never call `os.Exit` from inside `internal/` or `gui/` code.
  Let `main.go` be the only place that turns a returned error into a process exit code, via
  Cobra's own `Execute()` → non-nil error → `os.Exit(1)` pattern (this is what
  `cmd.Execute()` returning an error and `main.go` checking it already gives you — don't
  reimplement it).
- Register subcommands in `root.go`'s `init()` or an explicit `NewRootCmd()` constructor —
  pick one pattern and use it consistently across all commands in the project.

## Errors: preserve context, don't repeat it

```go
// Good — adds context at each layer boundary
return fmt.Errorf("loading configuration: %w", err)

// Bad — silently loses where the error happened
return err

// Bad — redundant, the wrapped error already says "config"
return fmt.Errorf("error loading config: %w", err) // if err is already "config: ..."
```

Wrap with `%w` at meaningful boundaries (entering/leaving a package, a distinct operation),
not at every single call site. A user-facing error message should read as one coherent
sentence, not `Error: failed to fail: failure failed`.

## Context

Propagate `context.Context` for operations that can genuinely take time or need cancellation:
network calls, subprocess execution, anything Cobra could reasonably want to cancel on
Ctrl+C. Cobra commands get a context via `cmd.Context()` (available on modern Cobra without
extra wiring once `ExecuteContext` is used from `main.go`, or `cmd.Context()` inside `RunE`
even without `ExecuteContext` — Cobra provides a background context by default).

Don't add `ctx context.Context` as the first parameter of every function reflexively — a
function like `config.Default() Config` that does no I/O and can't be cancelled doesn't need
one. Add it when there's a real reason (I/O, subprocess, something cancellable), not as house
style.

## Testing

Test `internal/` packages directly, with no Cobra and no Wails involved:

```go
func TestSaveAndLoadConfig(t *testing.T) {
    dir := t.TempDir()
    t.Setenv("XDG_CONFIG_HOME", dir)

    cfg := config.Default()
    cfg.Provider = "opencode"

    if err := config.Save(cfg); err != nil {
        t.Fatalf("Save: %v", err)
    }

    got, err := config.Load()
    if err != nil {
        t.Fatalf("Load: %v", err)
    }
    if got.Provider != "opencode" {
        t.Errorf("Provider = %q, want %q", got.Provider, "opencode")
    }
}
```

Prioritize tests for `internal/` logic that has real branching or failure modes (config
merge/defaults, installer steps, runner error paths). Don't chase coverage on trivial
one-line wrappers. `gui/` bindings are usually thin enough that testing the `internal/`
service underneath is sufficient — you don't need to launch Wails or a browser to verify
`SaveConfig` works, because `gui.App.SaveConfig` should be a 1-3 line pass-through you can
read at a glance for correctness, with the real logic (and its tests) living in
`internal/config`.

## Dependencies

Before adding a dependency, check whether the standard library already solves it
(`os`, `encoding/json`, `path/filepath`, `context`, `net/http` for simple cases). Expected
core dependencies for this stack:

- `github.com/spf13/cobra`
- `github.com/wailsapp/wails/v2` (or current stable — see `wails-facts.md`)
- Vue 3, Vite, TypeScript (frontend side, via `frontend/package.json`)
- A TOML library (`github.com/BurntSushi/toml` or `github.com/pelletier/go-toml/v2`) if the
  project uses TOML config

Add anything else only when it removes real, non-trivial complexity — not out of habit.

## Formatting and checks

Before considering a change done, run:

```bash
gofmt -l .      # should print nothing
go vet ./...
go test ./...
```

Prefer the plain, idiomatic Go form:

```go
if err != nil {
    return err
}
```

over introducing custom error-handling abstractions, generic `Result[T]` wrapper types, or
patterns imported from Java/C# (builder chains, dependency-injection containers, repository
interfaces with a single implementation). If a package only ever has one implementation, it
usually doesn't need an interface.
