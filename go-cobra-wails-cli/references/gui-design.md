# GUI look and feel

The window should read as a small modern app, not a traditional GTK forms dialog and not a
web page squeezed into a frame. Default toolkit for this: **plain Vue 3 + hand-written CSS**.

## Don't reach for a UI library by default

Skip Tailwind, shadcn-style component ports, Vuetify, PrimeVue, etc. unless the project has
grown enough screens/components that hand-written CSS is genuinely becoming repetitive and the
user agrees a library earns its weight. A single config form (checkboxes, a select, two
buttons) does not need a UI framework. Every added frontend dependency also adds to what
`wails build` has to bundle into the frontend assets embedded in the final binary.

## What plain CSS should use

- **CSS variables** for the palette and spacing, defined once (e.g. `:root` in
  `assets/styles.css`), so dark mode and theme changes are a handful of variable overrides,
  not a find-and-replace.
- **Dark mode** via `prefers-color-scheme` and/or a `data-theme` attribute driven by the
  persisted `ui.theme` config value — read the theme from the same `Config` the CLI writes, so
  `mycom config` and a hand-edited `config.toml` agree.
- **CSS Grid / Flexbox** for layout — a config form's field rows, a dashboard's card grid.
- **SVG icons**, inlined or as small individual `.svg` files imported as components — not an
  icon font.
- **Subtle transitions** (hover states, panel open/close, checkbox toggle) — short durations
  (~120-200ms), nothing flashy.

## Component shape

Match the directory layout in `architecture.md`: `frontend/src/pages/` for full screens (e.g.
`ConfigPage.vue`), `frontend/src/components/` for reusable pieces (a `Checkbox.vue`, a
`Select.vue`) once there's a second place that needs them — don't build a component library
for a single form.

## Example target: the config screen from the spec

```text
╭──────────────────────────────────────╮
│             MyCom                    │
│                                      │
│  Providers                           │
│                                      │
│  ☑ Claude Code                       │
│  ☑ OpenCode                          │
│  ☐ Cursor                            │
│  ☐ Codex                             │
│  ☐ Gemini                            │
│                                      │
│  Scope                               │
│  [ Project                        ▼ ] │
│                                      │
│                    Cancel   Save     │
╰──────────────────────────────────────╯
```

Implementation notes:
- On mount, call the bound Go method to load the current config (see `wails-facts.md` for the
  exact binding call syntax) and populate local `ref`/`reactive` state.
- Checkboxes and the select are pure Vue local state until Save is pressed — don't write to
  disk on every click.
- Save calls the bound Go save method with the whole updated config; Cancel just closes the
  window (or navigates away) without calling save.
- Validation that's purely visual (e.g. "at least one provider must be selected" shown inline)
  can live in Vue. Validation that determines whether the save is actually *allowed* to persist
  invalid state belongs in the Go service (`internal/config`), so the CLI path
  (`mycom config set ...`, if it exists) enforces the same rule.

`assets/templates/frontend_App.vue` is a minimal starting skeleton built on the same load-on-mount /
local-state-until-Save / call-bound-method pattern shown here, adapted to this skill's own
default `Config` shape (a single `Provider` string, so it uses a `<select>` rather than the
multi-checkbox mockup above). If a real project's config needs several independent toggles
like the mockup shows, repeat the `.checkbox-row` markup per option and change the underlying
Go field to a `[]string` — the CSS classes in `frontend_styles.css` already support both
shapes.
