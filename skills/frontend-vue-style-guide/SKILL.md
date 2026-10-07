---
name: frontend-vue-style-guide
description: Write, generate, or review maintainable Vue components, templates, and JavaScript single-file components using official Vue conventions. Use for `.vue` source files, compiled Vue output, component APIs, props, emits, templates, reactivity, lifecycle cleanup, and component-scoped styles; limit guidance to Vue with HTML, CSS, JavaScript, and supported stylesheet preprocessors.
---

# Frontend Vue Style Guide

Apply this skill to Vue and Nuxt frontend projects that use HTML, CSS or stylesheet preprocessors, and JavaScript. Do not introduce TypeScript, JSX, React, or another frontend ecosystem.

## Resolve Rules in Order

1. Follow the user's explicit requirements.
2. Follow the project's Vue version, ESLint, formatter, SFC, build, browser-target, and established local conventions.
3. Apply this skill's Vue component, prop ownership, lifecycle cleanup, source-ownership, and generated-output invariants, including applicable Priority A and B rules from the official Vue style guide.
4. Use Priority C and the remaining rules in this skill only as fallbacks.

Use caution with Priority D features and document why an exception is needed.

## Coordinate Companion Skills

Companion skills are optional specializations. Complete Vue work from this skill, official Vue conventions, and repository tooling when another named skill is not installed.

- Apply `frontend-javascript-style-guide` to JavaScript in `<script>` blocks and template expressions.
- Apply `frontend-style-guide` to HTML semantics and stylesheet formatting.
- Apply `frontend-bem-css` only when the project uses or requests BEM.
- Apply `frontend-responsive-mobile-first` to responsive rules in `<style>` blocks.
- Apply `frontend-nuxt` to Nuxt 4 installation, file conventions, routing, SSR-safe data, and generated output.
- Let Vue-aware parser and linter rules override generic formatting where Vue syntax requires it.

## Inspect the Vue Project

Before editing:

- identify Vue 2 or Vue 3, SFC tooling, and the active component API;
- preserve the package manager, lockfile, runtime version, and canonical build command; do not mix package managers, update a lockfile, change the runtime, or replace the build command unless the task requires it;
- inspect `eslint-plugin-vue`, formatter, router, state, and test conventions only as needed for the task;
- inspect component filename casing, template tag casing, directive shorthand, and style scoping;
- do not migrate APIs or add dependencies during a focused style change.

## Design Components

- Give user-defined components multi-word names except the root `App` and framework-provided components.
- Keep one component per file when the build system supports SFCs.
- Use PascalCase filenames and component tags by default; preserve consistent kebab-case filenames when the repository already uses them.
- Use full words in component names. Prefix base components consistently, such as `Base`, `App`, or `V`, when the project has that layer.
- Prefix tightly coupled child components with their parent component name.
- Keep props focused, declare them explicitly, and provide validation or defaults when it prevents invalid states.
- Never mutate a prop. Emit an event or derive local state when ownership must change.
- Declare emitted events when the Vue version supports it.
- Keep component public APIs smaller than their internal implementation.

## Write Templates

- Keep template expressions simple. Move branching, transformation, and reusable logic into computed values or functions.
- Add stable primitive keys to `v-for` items. Do not use array indexes when item identity can change.
- Do not place `v-if` and `v-for` on the same element; filter beforehand or use a wrapping `<template>` deliberately.
- Use camelCase for prop declarations and kebab-case for props in DOM-style templates when required by project convention.
- Keep directive shorthand (`:`, `@`, `#`) consistent within the project.
- Put multiple attributes on separate lines when that improves scanning or the formatter requires it.
- Self-close empty Vue components in SFC templates when that is the project convention. Follow HTML rules for native elements and void elements.
- Avoid `v-html` with untrusted or unsanitized content.

## Manage Reactivity and Lifecycle

- Keep computed getters free of side effects.
- Use watchers for effects, not for values that can be expressed as computed state.
- Avoid destructuring reactive objects in ways that lose reactivity.
- Clean up timers, listeners, observers, and subscriptions created by the component.
- Keep composables focused and name them with the established `use...` convention.
- Avoid broad deep watchers when a narrower dependency expresses the intent.
- Keep list rendering and reactive work proportional to visible UI needs.

## Scope Styles

- Scope application component styles with Vue `scoped`, CSS Modules, BEM, or another coherent class-based strategy.
- Allow global styles primarily in the application shell, layout layer, tokens, reset, and intentional utilities.
- Prefer class-based scoping for reusable component libraries so consumers can override styles predictably.
- Avoid deep selectors unless integrating a child or third-party component requires them; document that boundary.
- Preserve the current `lang` value and preprocessor pipeline.

## Generate Source and Compiled Vue Output

- Keep `.vue`, JavaScript, HTML, and preprocessor files in the configured source tree. For a new standalone Vue project without an established layout, author under `src/` and generate under `dist/`.
- Run the existing Vue build after each coherent source change set and always before handoff when code changed; do not rebuild after every individual file edit unless the toolchain requires it.
- Generate the configured HTML entry, CSS assets, JavaScript chunks, source maps, and manifest in the output directory.
- Never edit generated chunks, hashed assets, or compiled CSS directly.
- Verify both development readability and production compilation. Let the build tool control minification, hashes, and code splitting.
- If compiled output is ignored, still build and inspect it locally before handoff.
- After the final build, rerun it once with unchanged source when feasible. Require no unexplained tracked diff; compare semantic components, chunks, manifests, and behavior rather than promising byte equality when hashes or timestamps can vary.

Read [references/vue-conventions.md](references/vue-conventions.md) for a full review or when resolving component naming, template, API, and style-scoping decisions.

## Verify

- Run available verification in this order: formatter, linter, focused tests, canonical build,
  generated-output inspection, then visual and accessibility checks. Use the repository's
  Vue-aware linter and focused component or browser test targets.
- Check emitted events, prop ownership, keys, and lifecycle cleanup.
- Check template semantics, keyboard behavior, and accessible names.
- Check the generated Vue build and trace output problems back to source files.
- If a check cannot run, report its exact command, the blocking reason, and what remains unverified.
- Report deliberate deviations from official Priority A or B rules.

## Primary Sources

- [Official Vue style guide](https://vuejs.org/style-guide/)
- [Vue guide](https://vuejs.org/guide/)
- [eslint-plugin-vue](https://eslint.vuejs.org/)
