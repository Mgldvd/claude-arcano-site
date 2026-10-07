# Architecture reference

## Dependency direction

```text
scripts -> source assets and versioned configuration
main    -> core services
main    -> GUI factory
GUI     -> injected API contract
core   -X-> GUI
```

The composition root in `main.js` creates the GUI and supplies core operations. GUI files must not import or reimplement userscript storage, remote synchronization, content matching, or page scanning.

## Directory responsibilities

| Path           | Responsibility                                                     |
| -------------- | ------------------------------------------------------------------ |
| `.config.yml`  | Minimal versioned application identity and non-secret inputs.      |
| `package.json` | Application version and dependencies.                              |
| `mise.toml`    | Pinned tools and user-facing tasks.                                |
| `scripts/`     | Build, provisioning, configuration generation, and validation.     |
| `src/`         | Browser-only userscript sources.                                   |
| `src/gui/`     | Static GUI template, GUI styles, rendering, events, and lifecycle. |
| `worker/`      | Optional server-side API and its package configuration.            |
| `dist/`        | Generated installable userscript; never source.                    |

Do not place build or provisioning `.mjs` files in the project root. Do not use `generated/` for final userscripts.

## Source responsibilities

| File                        | Responsibility                                                   |
| --------------------------- | ---------------------------------------------------------------- |
| `metadata.js`               | Userscript metadata tokens only.                                 |
| `config.js`                 | Stable browser configuration and identifiers; never secrets.     |
| `core.js` or domain modules | Site behavior, state, storage, matching, and network operations. |
| `styles.css`                | Target-page feature styles.                                      |
| `gui/template.html`         | Static accessible GUI structure without dynamic values.          |
| `gui/styles.css`            | GUI-only presentation.                                           |
| `gui/settings.js`           | GUI lifecycle, DOM binding, events, and rendering.               |
| `main.js`                   | Composition, initialization, SPA lifecycle, and teardown.        |
| `scripts/build.mjs`         | Embedding, token replacement, assembly, and syntax validation.   |

## State flow

1. `main.js` injects `getState()` and command functions into `createSettingsGui()`.
2. `open()` reads a snapshot and populates controls using safe DOM properties.
3. Event handlers validate input and call injected commands.
4. Core commands update canonical state and persistence.
5. The GUI renders returned state or closes before core rescans.

Return snapshots or copies from `getState()` so GUI code cannot mutate core arrays accidentally.

## Template safety

Assigning the trusted build-time `GUI_TEMPLATE` to a GUI-owned root is acceptable. Never concatenate user, page, or remote values into it. Set dynamic data afterward:

```javascript
nameInput.value = state.name;
status.textContent = result.message;
```

## Lifecycle checklist

- `open()` closes or reuses the existing overlay.
- `mountControl()` checks for an existing control ID.
- Delegated listeners attach only to GUI-owned roots.
- `close()` removes the overlay.
- `teardown()` removes persistent controls and global listeners.
- SPA navigation refreshes core scope and tears down GUI state when leaving scope.

## Provisioning flow

For applications with a Cloudflare backend:

```text
.config.yml
    ↓ derive names
mise run setup
    ├── authenticate Wrangler
    ├── create R2 when missing
    ├── generate token in memory
    ├── deploy Worker secret
    ├── capture workers.dev URL
    ├── compile dist/*.user.js with the same token
    └── delete temporary secret material
```

After setup, the bearer value may exist only in Cloudflare's encrypted secret and the generated userscript. A later rebuild must rotate and redeploy it because Cloudflare does not return secret values.
