---
name: frontend-javascript-style-guide
description: Write, generate, or review maintainable browser JavaScript using repository conventions with Airbnb JavaScript as the fallback baseline. Use for `.js`, `.mjs`, browser modules, DOM scripts, source-versus-compiled browser output, and JavaScript regions of Vue components; do not apply to backend code or other programming languages.
---

# Frontend JavaScript Style Guide

Apply this skill only to browser JavaScript and JavaScript inside Vue files. Do not extend it to TypeScript, JSX/React, backend runtimes, or unrelated languages.

## Resolve Rules in Order

1. Follow the user's explicit requirements.
2. Follow the repository's ESLint, formatter, build, module, test, browser-target, and established local conventions.
3. Apply this skill's browser-only scope, source ownership, safety, cleanup, and compatibility invariants.
4. Use the Airbnb-derived rules in this skill as fallbacks.

Do not install `eslint-config-airbnb`, Babel, polyfills, or a formatter merely to apply the written rules. Airbnb's upstream guide assumes Babel and browser shims; verify the actual target environment instead.

## Inspect the Project

Before editing:

- inspect `package.json`, ESLint and formatter configuration, module type, and browser targets;
- preserve the package manager, lockfile, runtime version, and canonical build command; do not mix package managers, update a lockfile, change the runtime, or replace the build command unless the task requires it;
- identify whether semicolons, quote style, file extensions in imports, and trailing commas are automated;
- identify available DOM and Web APIs before introducing syntax or APIs;
- limit formatting to the touched code unless a broader normalization is requested.

## Apply the Core Baseline

- Declare references with `const`; use `let` only for reassignment; never use `var`.
- Declare one variable per statement and keep its scope close to use.
- Use object and array literals, property/method shorthand, destructuring, rest, and spread when they improve clarity.
- Avoid accidental mutation. Do not use `Object.assign()` in a way that mutates its first argument.
- Use single quotes for ordinary strings and template literals for interpolation or multiline content.
- Use default parameters instead of mutating arguments; never use `arguments` when rest parameters express the intent.
- Use arrow functions for short anonymous callbacks; use a named function when logic is substantial, recursive, or needs its own `this`/`arguments`.
- Use ES modules when the current browser build supports them. Keep imports together and avoid duplicate imports from one source.
- Use `===` and `!==`, braces around multiline control flow, and explicit handling of nullable values.
- Use descriptive camelCase names for values and functions and PascalCase for constructors or classes.
- Indent with 2 spaces, include semicolons, use trailing commas in multiline structures where syntax permits, and keep lines near 100 characters unless project tooling says otherwise.
- End files with one newline and remove trailing whitespace.

Read [references/airbnb-browser-rules.md](references/airbnb-browser-rules.md) when performing a full review, configuring equivalent lint rules, or resolving a JavaScript-specific question.

## Write Safe Browser Code

- Never use `eval()` or string-created functions.
- Do not call `Object.prototype` methods directly on unknown objects; prefer `Object.hasOwn()` when browser support allows it.
- Use `Number.isNaN()` and `Number.isFinite()` instead of coercive global versions.
- Keep DOM queries scoped and cache a lookup only when reuse or measurement justifies it.
- Use semantic HTML behavior before recreating controls in JavaScript.
- Register listeners deliberately and remove long-lived listeners, observers, timers, and subscriptions during teardown.
- Treat injected HTML as untrusted; prefer text APIs and safe DOM construction.
- Handle rejected promises and failed network operations at the boundary that can recover or report them.

## Handle Compatibility

- Verify syntax and Web APIs against the repository's supported browsers.
- Do not add a polyfill without confirming the gap, payload cost, and loading strategy.
- Avoid TC39 proposals below stage 3, and avoid stage-3 syntax unless the build and targets support it.
- Prefer progressive enhancement for optional browser capabilities.

## Generate Source and Browser Output

- Author JavaScript in the project's source directory and treat it as the only editable source of truth.
- When generating code, also run the configured build and produce the corresponding browser files in `dist/`, `build/`, or the existing output directory.
- Follow existing directories; for a new standalone deliverable with no convention, author under `src/` and generate under `dist/`.
- Build after each coherent JavaScript change set and always before handoff when code changed; do not rebuild after every individual file edit unless the toolchain requires it.
- Never patch bundled, transpiled, hashed, or minified JavaScript directly.
- For native ESM that needs no transformation, use a reproducible build or copy task rather than maintaining a second file by hand.
- Generate source maps when configured and inspect bundle warnings, chunk changes, and build errors.
- If output is ignored by version control, verify it locally and report the build command and location.
- After the final build, rerun it once with unchanged source when feasible. Require no unexplained tracked diff; compare semantic modules, chunks, and manifests rather than promising byte equality when hashes or timestamps can vary.

## Coordinate Vue

Companion skills are optional. This skill must still produce valid, maintainable browser JavaScript when they are unavailable. When editing a `.vue` file and companions are installed:

- use `frontend-vue-style-guide` for component API, template, lifecycle, and SFC structure;
- use `frontend-nuxt` for Nuxt 4 configuration, auto-imports, SSR boundaries, and build output;
- apply this skill to JavaScript expressions and `<script>` content;
- let the Vue lint/parser configuration override generic JavaScript formatting where syntax requires it;
- do not convert JavaScript to TypeScript.

## Review Checklist

- Confirm lint, formatter, module, and browser-target configuration.
- Check scope, reassignment, mutation, equality, and async error paths.
- Check module boundaries and duplicate imports.
- Check DOM cleanup and unsafe HTML injection.
- Check that source JavaScript was built and generated output was not edited directly.
- Run available verification in this order: formatter, linter, focused tests, canonical build,
  generated-output inspection, then visual and accessibility checks.
- If a check cannot run, report its exact command, the blocking reason, and what remains unverified.
- Report intentional deviations from the fallback rules.

## Primary Source

- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
