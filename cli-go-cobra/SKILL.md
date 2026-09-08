---
name: cli-go-cobra
description: Scaffold, extend, or review Go command-line applications built with the Cobra framework (github.com/spf13/cobra, docs at cobra.dev), optionally polished with the Charm ecosystem (charm.land) — fang for styled help/usage/errors/version, lipgloss for custom styling, huh for interactive prompts/forms, and log for pretty structured logging. Use when creating a new Cobra CLI from scratch, running `cobra-cli init`/`add`, adding a subcommand, declaring local vs. persistent flags, marking a flag required or mutually exclusive, validating positional arguments, wiring PreRunE/RunE error handling, generating shell completions, wrapping a root command with fang, styling terminal output with lipgloss, building an interactive prompt with huh, adding leveled/structured logs with charm/log, or cleaning up cobra-cli generated boilerplate. For a CLI that also needs to open a native GUI window for specific commands (Wails), use `cli-go-cobra-wails` instead — this skill is terminal-only, no GUI window.
---

# Cobra CLI (Go)

Cobra is the CLI framework behind `kubectl`, `docker`, `hugo`, and thousands of other Go binaries: a `*cobra.Command` tree, automatic `--help`/usage generation, flag parsing (via `pflag`), and shell completion, in exchange for structuring the app as commands instead of hand-rolled `os.Args` parsing.

Everything below was run and verified in this container against `github.com/spf13/cobra v1.10.2` and `cobra-cli v1.3.0` — not recalled from memory. Where current cobra.dev docs and the installed source disagreed or were incomplete, the source (`args.go`, actual command output) wins.

For a polished CLI, Cobra is the skeleton and [Charm](https://charm.land/)'s libraries are the layers on top of it — each one optional, each one independently droppable in:

```
cobra                         → command tree, flags, args parsing
  │
  ├── fang       → styled help / usage / errors, automatic --version
  │
  ├── lipgloss   → custom styling (colors, borders, layout) for your own output
  │
  ├── huh        → interactive prompts / forms
  │
  └── log        → pretty leveled, structured logging
```

All four were installed and exercised for real in this container too (module versions below) — see "The Charm layer" further down.

## Install

```bash
go get -u github.com/spf13/cobra@latest      # the library, inside your module
go install github.com/spf13/cobra-cli@latest  # the scaffolding generator (installs to $GOPATH/bin)
```

`cobra-cli` is optional — it only generates boilerplate. Nothing it produces requires the generator at runtime.

## Scaffolding a new project

```bash
mkdir my-cli && cd my-cli
go mod init my-cli                 # or a real module path, e.g. github.com/user/my-cli
cobra-cli init --author "Your Name" --license none
```

This produces:

```
my-cli/
  main.go        # calls cmd.Execute(), nothing else
  cmd/root.go    # rootCmd (*cobra.Command), Execute(), root-level flags
  go.mod
  go.sum
```

Add each subcommand with the generator, then fill in the generated stub:

```bash
cobra-cli add greet
```

This creates `cmd/greet.go` with a `greetCmd` pre-wired into `rootCmd` via `AddCommand` in `init()` — you edit the `Use`/`Short`/`Run` fields and add flags; you don't need to touch the wiring.

**Gotcha — run `gofmt -w .` immediately after `cobra-cli init`/`add`.** The generator's own templates are not `gofmt`-clean out of the box (verified: both a fresh `init` and a fresh `add` leave stray blank lines around the copyright header and at EOF, which `gofmt -l .` flags). Don't chase this down file by file — just reformat right after scaffolding, before your first commit.

## Command shape

Prefer `RunE` over `Run` so errors propagate through Cobra's own error handling instead of requiring manual `os.Exit` calls inside the command body:

```go
var greetCmd = &cobra.Command{
    Use:   "greet [name]",
    Short: "Print a friendly greeting",
    Args:  cobra.MaximumNArgs(1),
    RunE: func(cmd *cobra.Command, args []string) error {
        name := "world"
        if len(args) == 1 {
            name = args[0]
        }
        fmt.Printf("Hello, %s!\n", name)
        return nil
    },
}

func init() {
    rootCmd.AddCommand(greetCmd)
}
```

Verified behavior:

```text
$ ./my-cli greet
Hello, world!
$ ./my-cli greet World -s   # -s wired to a local bool flag, see below
Hello, World!!!
```

`Execute()` in `cmd/root.go` (generated as-is, don't change the pattern) is the only place a returned error becomes a process exit code:

```go
func Execute() {
    err := rootCmd.Execute()
    if err != nil {
        os.Exit(1)
    }
}
```

### Args validators

`cobra.Args` accepts a `PositionalArgs` function. Confirmed against the installed `args.go` source (`$GOPATH/pkg/mod/github.com/spf13/cobra@v1.10.2/args.go`) — this is the complete set, not a curated subset:

| Validator | Behavior |
|---|---|
| `cobra.NoArgs` | errors if any positional args are given |
| `cobra.ArbitraryArgs` | accepts any number, no check |
| `cobra.MinimumNArgs(n)` | at least `n` |
| `cobra.MaximumNArgs(n)` | at most `n` |
| `cobra.ExactArgs(n)` | exactly `n` |
| `cobra.RangeArgs(min, max)` | between `min` and `max` inclusive |
| `cobra.OnlyValidArgs` | every arg must be in `cmd.ValidArgs` |
| `cobra.ExactValidArgs(n)` | `ExactArgs(n)` + `OnlyValidArgs` combined |
| `cobra.MatchAll(fns...)` | AND together multiple validators |

A failing validator exits `1` and prints usage automatically — verified:

```text
$ ./my-cli greet a b
Error: accepts at most 1 arg(s), received 2
Usage:
  my-cli greet [name] [flags]
...
$ echo $?
1
```

## Flags

**Local** (`cmd.Flags()`) apply to one command only. **Persistent** (`cmd.PersistentFlags()`) are inherited by every descendant. Put only genuinely global flags (`--verbose`, `--config`) on the root as persistent — don't make a flag persistent just to avoid redeclaring it.

```go
// root.go — persistent, visible everywhere
var verbose bool
func init() {
    rootCmd.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false, "enable verbose output")
}

// greet.go — local, only on `greet`
var shout bool
func init() {
    greetCmd.Flags().BoolVarP(&shout, "shout", "s", false, "add extra emphasis")
}
```

Verified: a persistent flag declared on root works when passed on a subcommand invocation (`./my-cli greet --verbose World` behaves identically to `./my-cli --verbose greet World`), and shows up under "Global Flags" in the subcommand's own `--help`.

Bind straight to a variable with the `*Var`/`*VarP` forms (`StringVarP`, `IntVarP`, `BoolVarP`, `DurationVarP`, `StringSliceVar`, ...) instead of calling `cmd.Flags().GetString(...)` inside `RunE` — it's one less error to check and the value is available anywhere in the package.

### Required flags

```go
loginCmd.Flags().StringVar(&username, "username", "", "username")
if err := loginCmd.MarkFlagRequired("username"); err != nil {
    panic(err) // only fails if the flag name doesn't exist — a programmer error
}
```

Verified output when omitted:

```text
$ ./my-cli login
Error: required flag(s) "username" not set
```

### Mutually exclusive / cross-flag validation

Cobra has no built-in "mutually exclusive" flag declaration for arbitrary custom logic beyond `MarkFlagsMutuallyExclusive` / `MarkFlagsRequiredTogether` (both exist on `*cobra.Command` for simple pairs/groups). For anything more custom, validate in `PreRunE` so the check happens before `RunE`, keeping `RunE` itself free of validation noise:

```go
PreRunE: func(cmd *cobra.Command, args []string) error {
    if stdout && outPath != "" {
        return fmt.Errorf("--stdout and --out are mutually exclusive")
    }
    switch format {
    case "json", "yaml":
    default:
        return fmt.Errorf("invalid --format: %s (want json|yaml)", format)
    }
    return nil
},
```

## Shell completions

Cobra generates a `completion` subcommand **automatically** — confirmed by building a fresh scaffold and running `--help` without adding anything: `completion` and `help` both appear unprompted alongside user-added commands. The cobra.dev how-to guide's `cobra-cli add completion` step is unnecessary on current Cobra; don't run it.

```bash
./my-cli completion bash > my-cli-completion.bash   # also: zsh, fish, powershell
```

## Project layout for anything beyond a couple of commands

Keep `cmd/*.go` thin — construct the command, wire flags, call one function, print the result — and put real logic in an importable package the command calls into:

```go
// cmd/serve.go
var serveCmd = &cobra.Command{
    Use: "serve",
    RunE: func(cmd *cobra.Command, args []string) error {
        return server.Run(cmd.Context(), server.Options{Port: port})
    },
}
```

This keeps business logic testable without spinning up Cobra at all (`go test ./internal/...` calls `server.Run` directly), and is exactly the split `cli-go-cobra-wails` builds on for CLI-first, GUI-on-demand apps — reach for that skill instead of this one once a command needs an actual window, not just a terminal prompt.

## The Charm layer

Confirmed real module paths — **these are not uniform**, and guessing wrong is the most likely mistake here: fang stays on its GitHub path, while lipgloss/huh/log moved to the `charm.land` vanity domain (v2). Verified by actually resolving each with `go get` in this container:

```bash
go get github.com/charmbracelet/fang@latest   # v1.0.0 — NOT charm.land/fang, that path doesn't exist
go get charm.land/lipgloss/v2@latest          # v2.0.6
go get charm.land/huh/v2@latest               # v2.0.3
go get charm.land/log/v2@latest               # v2.0.1
```

### fang — styled help/usage/errors/version

Replace `rootCmd.Execute()` with `fang.Execute`. This is the one structural change fang makes — everything else (styled `--help`, boxed errors, silenced usage-on-error, automatic `--version`) comes for free once you do:

```go
// cmd/root.go
func Execute(ctx context.Context) error {
    return fang.Execute(ctx, rootCmd, fang.WithVersion("0.1.0"))
}

// main.go
func main() {
    if err := cmd.Execute(context.Background()); err != nil {
        os.Exit(1)
    }
}
```

Verified: `--help` renders as boxed, colored sections (`USAGE`, `COMMANDS`, `FLAGS`) instead of plain Cobra text; `--version` prints `<name> version 0.1.0` with zero extra flag wiring; an unknown subcommand prints inside a styled `ERROR` box and still exits `1`. `fang.Execute` takes a `context.Context` as its first argument — thread one down from `main`, don't call `context.Background()` again lower in the tree.

### lipgloss — styling your own output

```go
var bannerStyle = lipgloss.NewStyle().
    Bold(true).
    Foreground(lipgloss.Color("#FAFAFA")).
    Background(lipgloss.Color("#7D56F4")).
    Padding(0, 1)

fmt.Println(bannerStyle.Render("chirp"))
```

Verified this emits real truecolor ANSI escapes (`\x1b[48;2;125;86;244m...`), not just a struct — piping through a terminal that supports truecolor renders it as intended. Note the import is `charm.land/lipgloss/v2`, matching the `/v2` fang itself already pulls in as a transitive dependency — don't end up with both `charm.land/lipgloss/v2` and an older `github.com/charmbracelet/lipgloss` in the same module; use the v2 path everywhere.

### huh — interactive prompts

```go
var name string
form := huh.NewForm(
    huh.NewGroup(
        huh.NewInput().Title("What's your name?").Value(&name),
    ),
)
err := form.WithAccessible(os.Getenv("ACCESSIBLE") != "").Run()
```

**Gotcha — huh needs a real TTY unless you ask for Accessible mode.** Verified directly: running a huh form with stdin piped (no TTY) and `Accessible` left `false` fails immediately with `Huh: bubbletea: error opening TTY: ... open /dev/tty: no such device or address`. With `form.WithAccessible(true)` (wired to an `ACCESSIBLE` env var, per upstream's own recommendation), the same form falls back to plain sequential prompts that read fine from a pipe:

```text
$ echo "Gopher" | ACCESSIBLE=1 ./chirp setup
What's your name?
Configured for: Gopher
```

This matters beyond CI: it's exactly the failure mode a driver script or a `run`-style skill hits when it tries to pipe input into an interactive Cobra+huh command headlessly. Always give a form's accessible mode an escape hatch (env var or flag) rather than hardcoding `false`.

### log — structured, leveled logging

```go
import "charm.land/log/v2"

log.SetLevel(log.DebugLevel)  // default level is Info — Debug is silent otherwise, verified
log.Debug("resolving target", "env", "staging")
log.Info("deploy started", "service", "chirp")
log.Warn("cache miss", "key", "manifest")
log.Error("deploy failed", "err", err)
```

Verified output (package-level default logger, timestamps trimmed here for readability):

```text
DEBUG resolving target env=staging
INFO  deploy started service=chirp
WARN  cache miss key=manifest
ERROR deploy failed err="connection refused"
```

Confirmed: `log.Debug` produces no output at all until `log.SetLevel(log.DebugLevel)` is called — the default level is Info, so a silent debug log is expected behavior, not a bug, until you raise the level.

## Verification checklist

Before calling a Cobra change done:

- [ ] `gofmt -l .` prints nothing (run `gofmt -w .` right after any `cobra-cli` scaffold step — see Gotcha above).
- [ ] `go vet ./...` is clean.
- [ ] `go build -o <name> .` succeeds and `./<name> --help` reads well.
- [ ] Each new subcommand's `--help` output looks right, and an invalid-args case (wrong arg count, missing required flag) produces a clear error and a non-zero exit code — don't just assert this, run it.
- [ ] `go test ./...` passes.
- [ ] If using huh: run the command with stdin piped and no TTY at least once — confirm it either has `Accessible` wired to an env var/flag, or is only ever invoked interactively on purpose.
