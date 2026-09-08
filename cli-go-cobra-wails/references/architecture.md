# Architecture: CLI-first, GUI-on-demand

## Contents

- [The governing rule](#the-one-rule-that-governs-every-decision)
- [Layer ownership](#layers-and-what-belongs-where)
- [Directory layout](#directory-layout-medium-sized-project)
- [Linux configuration](#linux-configuration-conventions-xdg)
- [TOML configuration](#config-format-toml-for-humans)

## The one rule that governs every decision

> The binary is a CLI. Some of its subcommands happen to be able to open a window.

Cobra is the entrypoint for everything, always. Wails is never initialized, imported-and-run,
or given control unless the specific subcommand the user typed is a GUI (or hybrid) command.
Running `mycom init`, `mycom run`, `mycom status`, etc. must not link in any windowing
behavior at runtime — no window created, no WebKitGTK context spun up, nothing.

Concretely this means: **exactly one function** in the whole codebase calls into the Wails
runtime (`wails.Run(...)` or the current stable equivalent — see `wails-facts.md`), and that
function is only reachable from the `RunE` of GUI-designated commands (e.g. `config`).

```text
                    mycom
                      │
                    Cobra (cmd/root.go)
                      │
        ┌─────────────┼─────────────┐
        │             │             │
      init           run          config
   (cmd/init.go)  (cmd/run.go)  (cmd/config.go)
        │             │             │
        ▼             ▼             ▼
  internal/installer  internal/runner   gui.RunConfigGUI()
                                          │
                                          ▼
                                        Vue (frontend/)
                                          │
                                          ▼
                                  internal/config (same Go service)
```

`init` and `run` never import `gui`. `config` is the only file in `cmd/` that imports `gui`.
`gui` is the only package that imports Wails. This keeps the import graph itself proof that
CLI commands can't accidentally drag in GUI machinery.

## Layers and what belongs where

| Layer | Directory | Owns | Must NOT contain |
|---|---|---|---|
| CLI wiring | `cmd/` | Cobra commands, subcommands, flags, arg validation, printing results/errors to the terminal | Business logic, file I/O beyond calling a service, GUI imports (except the one GUI command file) |
| Business logic | `internal/<domain>/` | The actual behavior: config load/save, install steps, run steps — pure Go, no Cobra, no Wails | `cobra.Command`, `wails` imports, `fmt.Println` for UI purposes (return data/errors, let the caller print) |
| GUI bridge | `gui/` | Thin adapter exposing `internal/` services as bound methods for the frontend; owns window lifecycle | Business logic — a bound method should be a 1-3 line pass-through to `internal/` |
| Frontend | `frontend/` | Vue components, forms, layout, visual state (loading/open modal/active tab) | Anything that decides *what* to persist or *how* — that's Go's job |
| Config | `internal/config/` | Struct definitions, TOML marshal/unmarshal, XDG path resolution | GUI or CLI concerns |

The test for "is this in the right place": *could `internal/config.Load()` be unit-tested
without importing Cobra or Wails at all?* If not, logic has leaked into the wrong layer.

## Directory layout (medium-sized project)

```text
mycom/
├── go.mod
├── go.sum
├── main.go              # cmd.Execute(assets) + the go:embed frontend/dist directive
├── wails.json            # Only relevant to the gui/ + frontend/ build
├── Makefile
│
├── cmd/
│   ├── root.go           # root command, persistent flags, cmd.Execute()
│   ├── init.go
│   ├── run.go
│   ├── status.go
│   └── config.go         # the only cmd/ file that imports gui
│
├── internal/
│   ├── config/
│   │   ├── config.go      # struct + defaults
│   │   └── storage.go     # XDG paths, TOML load/save
│   ├── installer/
│   │   └── installer.go
│   └── runner/
│       └── runner.go
│
├── gui/
│   ├── app.go             # RunConfigGUI(), window options, lifecycle
│   └── bindings.go        # struct whose methods are exposed to the frontend
│
└── frontend/
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── App.vue
        ├── main.ts
        ├── components/
        ├── pages/
        └── assets/styles.css
```

Treat this as a default, not a mandate. A project with one GUI screen and two CLI commands
should be flatter — don't create `internal/runner/` for a 10-line function; put it in
`internal/app/` or even directly in `cmd/run.go` if it's genuinely trivial and will stay
that way. Don't create `internal/<domain>/` packages preemptively for domains that don't
exist yet.

## Linux configuration conventions (XDG)

Prefer XDG base directories over inventing paths:

- Config: `$XDG_CONFIG_HOME/mycom/config.toml`, falling back to `~/.config/mycom/config.toml`
- Data: `$XDG_DATA_HOME/mycom/`, falling back to `~/.local/share/mycom/`
- Cache: `$XDG_CACHE_HOME/mycom/`, falling back to `~/.cache/mycom/`
- Logs: put them under the data or cache dir (`~/.local/share/mycom/logs/` or
  `~/.cache/mycom/log/`) rather than inventing a fifth directory — Linux has no XDG "logs" var.

Go's standard library gives you most of this directly:
- `os.UserConfigDir()` already implements the XDG_CONFIG_HOME logic (and falls back correctly).
- `os.UserCacheDir()` does the same for XDG_CACHE_HOME.
- There is no `os.UserDataDir()` — read `XDG_DATA_HOME` yourself with a `~/.local/share`
  fallback, mirroring the same pattern the stdlib uses internally.

Write one small helper per path kind in `internal/config/storage.go` (or a dedicated
`internal/xdg` package only if more than one `internal/` package needs these paths):

```go
func configPath() (string, error) {
    dir, err := os.UserConfigDir() // honors XDG_CONFIG_HOME, falls back to ~/.config
    if err != nil {
        return "", fmt.Errorf("resolving config directory: %w", err)
    }
    return filepath.Join(dir, "mycom", "config.toml"), nil
}
```

Don't build a generic "path provider" abstraction/interface for this — three small functions
are clearer than one configurable abstraction with a single real caller.

## Config format: TOML for humans

Use TOML (`github.com/BurntSushi/toml` or `github.com/pelletier/go-toml/v2`) for config files a
human might read or hand-edit. JSON is fine for machine-only state (cache indices, lockfiles)
where a human is never expected to open the file. Don't reach for a database (SQLite etc.) for
config or small state — a single TOML/JSON file plus `os.WriteFile` with an `O_CREATE|O_TRUNC`
write (or write-to-temp-then-rename for crash safety, only if that matters for the use case) is
enough.

```toml
provider = "claude"
scope = "project"

[ui]
theme = "dark"
```

```go
package config

type Config struct {
    Provider string   `toml:"provider"`
    Scope    string   `toml:"scope"`
    UI       UIConfig `toml:"ui"`
}

type UIConfig struct {
    Theme string `toml:"theme"`
}

func Default() Config {
    return Config{Provider: "claude", Scope: "project", UI: UIConfig{Theme: "dark"}}
}
```

This `Config` type and its `Load`/`Save` functions in `internal/config` are what both `cmd/`
and `gui/` call — never duplicate the struct or the (de)serialization logic in the frontend or
in a GUI-only copy.
