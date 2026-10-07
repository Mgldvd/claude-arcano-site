# Vue Conventions

Use this reference for Vue-specific decisions. Apply the repository's Vue version and lint configuration first; do not copy Vue 3 syntax into Vue 2 or migrate an existing component API without authorization.

## Contents

- [Priority model](#priority-model)
- [Component files and names](#component-files-and-names)
- [Props and events](#props-and-events)
- [Templates](#templates)
- [Reactivity and effects](#reactivity-and-effects)
- [Styles](#styles)
- [Single-file components](#single-file-components)
- [Boundaries](#boundaries)

## Priority Model

- Treat Priority A rules as error prevention and deviate only with expert justification.
- Treat Priority B rules as the default for readability and maintainability.
- Treat Priority C rules as consistency choices; preserve a coherent repository decision.
- Treat Priority D features as tools for exceptional or legacy cases, not defaults.

## Component Files and Names

- Keep one component per `.vue` file when SFC tooling is available.
- Use multi-word component names to avoid collisions with current or future HTML elements.
- Choose PascalCase or kebab-case filenames and use it consistently; prefer PascalCase when no convention exists.
- Use PascalCase component tags in SFC templates when supported by the project.
- Use full words over uncommon abbreviations.
- Prefix base components consistently (`BaseButton`, `AppButton`, or `VButton`).
- Prefix tightly coupled children with their parent (`TodoListItem`, `TodoListItemButton`).
- Use `The` prefixes only for genuinely single-instance application components when the repository follows that convention.

## Props and Events

- Declare props explicitly. Add types, required flags, validators, and factory defaults where they prevent invalid use.
- Use a factory for mutable object or array defaults in APIs that require one.
- Keep prop declarations camelCase in JavaScript and follow the template casing supported by the project.
- Treat props as read-only inputs.
- Declare emitted events with `emits` or `defineEmits` when available.
- Use an event or `v-model` contract instead of mutating parent-owned state.
- Keep event payloads minimal, stable, and documented by names or validation.
- Avoid reaching into child internals through refs when a prop/event API can express the interaction.

## Templates

- Keep expressions declarative and short.
- Use computed state for filtered or transformed lists instead of combining `v-if` and `v-for` on one node.
- Provide stable unique keys for stateful list items.
- Use semantic native elements for controls before adding roles or keyboard emulation.
- Keep directive shorthand consistent.
- Put multiple attributes on separate lines when the project formatter does so.
- Keep attribute ordering consistent with the active Vue linter; do not apply a standalone HTML order over an enforced Vue order.
- Self-close empty custom components in SFCs when consistent; never invent XML closing syntax for native HTML void elements.
- Avoid methods in templates when they perform expensive work on every render.
- Sanitize trusted rich content before it reaches `v-html`; never treat escaping alone as sanitization.

## Reactivity and Effects

- Keep computed getters pure.
- Use watchers for external effects and computed values for derived data.
- Use the narrowest watch source and flush timing that fits the interaction.
- Preserve reactivity when extracting properties; use the Vue helpers appropriate to the installed version.
- Clean up manual resources on invalidation or unmount.
- Keep composables focused on one reusable concern and return a small explicit API.
- Avoid hidden cross-component mutation and broad global reactive state for local concerns.

## Styles

- Scope component styles through `scoped`, CSS Modules, BEM, or a documented class strategy.
- Keep selectors based on classes rather than tag depth.
- Use `:deep()` only at an intentional ownership boundary.
- Keep tokens and global foundations outside leaf components.
- Preserve `lang="scss"`, `lang="less"`, PostCSS, Stylus, or plain CSS according to the current build.
- Apply responsive and BEM companion skills rather than duplicating their rules here.

## Single-file Components

- Preserve the repository's order for `<template>`, `<script>`, and `<style>` blocks.
- Preserve Options API, Composition API, or `<script setup>` locally unless migration is requested.
- Keep component-only code with the component; extract reusable browser JavaScript or composables only when ownership becomes clearer.
- Avoid multiple unrelated components hidden in one SFC.
- Keep global side effects out of module evaluation when lifecycle ownership is required.

## Boundaries

This skill covers Vue with HTML, CSS, JavaScript, Sass, Less, PostCSS, Stylus, and native CSS nesting. It does not provide TypeScript, JSX, React, backend, or other-language conventions.

Primary sources:

- [Vue style guide](https://vuejs.org/style-guide/)
- [Vue essential rules](https://vuejs.org/style-guide/rules-essential.html)
- [Vue strongly recommended rules](https://vuejs.org/style-guide/rules-strongly-recommended.html)
- [eslint-plugin-vue user guide](https://eslint.vuejs.org/user-guide/)
