---
name: tampermonkey-gui-builder
description: Create, refactor, provision, build, and validate modular Tampermonkey, Greasemonkey, or Violentmonkey applications with GUI HTML, CSS, and JavaScript separated at source and compiled into one self-contained userscript. Use for settings panels, dialogs, floating controls, forms, GUI/core separation, clean project organization, Mise-controlled setup, or optional Cloudflare Worker and R2 synchronization without persistent plaintext secrets.
---

# Tampermonkey GUI Builder

Produce a modular source project and one network-independent userscript.

## Workflow

1. Inspect the project and applicable userscript instructions.
2. For a new project, copy `assets/project-template/` into the destination. Never edit the asset template in place.
3. For an existing project, preserve behavior and migrate incrementally using `references/architecture.md`.
4. Keep the root minimal: project configuration, package manifests, Mise, README, and primary directories only. Put build, provisioning, and configuration generators in `scripts/`.
5. Keep site behavior, storage, network access, matching, and DOM scanning outside `src/gui/`.
6. Expose a narrow dependency-injected GUI API such as `getState`, `save`, `sync`, and `rescan`. Do not expose mutable core globals.
7. Keep GUI HTML static. Populate dynamic values with `.value`, `.textContent`, attributes, or DOM methods. Never concatenate untrusted data into `innerHTML`.
8. Embed GUI HTML and CSS at build time. Do not download application assets when the userscript runs unless explicitly requested and the latency and availability tradeoffs are accepted.
9. Configure tool versions and the primary workflow in root `mise.toml`. Make `mise run setup` perform every required generation step and produce `dist/<application-id>.user.js`.
10. Derive `@version` from `package.json` and application identity from `.config.yml`. Do not duplicate these values.
11. Build, syntax-check the complete output, inspect its metadata, and state that target-site behavior still requires browser testing.

## Required structure

```text
project/
├── .config.yml
├── .gitignore
├── README.md
├── mise.toml
├── package.json
├── package-lock.json
├── scripts/
│   └── build.mjs
├── src/
│   ├── metadata.js
│   ├── config.js
│   ├── core.js
│   ├── main.js
│   ├── styles.css
│   └── gui/
│       ├── template.html
│       ├── styles.css
│       └── settings.js
└── dist/
    └── <application-id>.user.js
```

Add `worker/` only when remote synchronization or server-side behavior is required. Add provisioning modules to `scripts/`; do not scatter executable `.mjs` files across the root. Adapt core filenames for clear domains such as `sync.js`, `storage.js`, or `blocking.js` while preserving `src/gui/` as the GUI boundary.

## Sources of truth

- Keep versioned, non-secret identity and deployment inputs in `.config.yml`. Request only values that cannot be derived.
- Keep the application version and dependencies in `package.json`.
- Derive output names, Worker names, bucket names, routes, and generated configuration whenever possible.
- Treat `dist/`, deployment state, Wrangler configuration, and runtime configuration as generated outputs.
- Never ask the user to copy values that provisioning tools can return automatically.

## GUI contract

Implement the GUI as a factory:

```javascript
const createSettingsGui = ({ getState, save, closeEffects }) => {
  // Return lifecycle methods without reading core globals directly.
  return { open, close, mountControl, teardown };
};
```

Make `open` idempotent, replace any existing overlay before mounting, and make `teardown` remove GUI controls and owned listeners. Treat queried elements as nullable.

## Build contract

- Keep the metadata block as the first bytes of the generated file.
- Wrap browser code in one IIFE with `'use strict';`.
- Preserve deterministic module order.
- Encode embedded HTML and CSS using `JSON.stringify` or an equivalent safe serializer.
- Reject unresolved build tokens.
- Create `dist/` when missing and never use `generated/` for final artifacts.
- Syntax-check the assembled output during `mise run setup`.
- Keep Node-only APIs inside `scripts/`; never emit them into the userscript.
- Keep the root README concise: commands first, minimal configuration second, technical details later.

## Optional Cloudflare Worker and R2

When remote persistence is required:

1. Implement the API under `worker/`; prefer Hono when it keeps routing and validation simple.
2. Derive Worker and bucket names from the application ID unless the platform requires explicit values.
3. Make `mise run setup` authenticate Wrangler, create missing R2 resources, deploy the Worker, capture its real URL, and build the userscript.
4. Generate a random bearer token in process memory. Pass it to Wrangler through a permission-restricted temporary file, build with the same in-memory value, and delete the temporary file in `finally`.
5. Do not create `.env`, commit secrets, print tokens, or attempt to retrieve an existing Cloudflare secret.
6. Store only non-secret generated deployment state locally. Ignore it in Git.
7. Rotate the token and redeploy whenever setup rebuilds the userscript so both copies remain synchronized.

## Validation

- Request only grants actually used and declare every cross-origin host with `@connect`.
- Require HTTPS for external endpoints.
- Reject hardcoded secrets, API keys, cookies, and passwords in source or versioned configuration.
- Guard initialization, styles, controls, and overlays against duplication.
- Disconnect observers and remove listeners during teardown where lifecycle permits.
- Handle asynchronous failures and failed provisioning with actionable messages.
- Confirm GUI code contains no network, storage, matching, or page-scanning implementation.
- Run setup/build validation without creating live cloud resources unless deployment was explicitly requested.

Read `references/architecture.md` when designing a boundary, organizing a project, or reviewing an existing separation.
