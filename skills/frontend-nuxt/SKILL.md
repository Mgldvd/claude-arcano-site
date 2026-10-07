---
name: frontend-nuxt
description: Create, install, structure, generate, or review Nuxt 4 frontend applications using Vue, HTML, browser JavaScript, CSS, Sass, Less, PostCSS, or Stylus. Use for Nuxt setup, `app/` conventions, pages, layouts, components, composables, plugins, routing, SSR-safe data fetching, hydration, assets, styling, and `.output/` builds; exclude TypeScript, Nitro/server APIs, backend code, and other frameworks.
---

# Frontend Nuxt 4

Build Nuxt 4 frontend applications with framework-native structure and reproducible output. Keep this skill frontend-only: do not create or review `server/` routes, Nitro handlers, databases, backend authentication, or deployment infrastructure.

## Resolve Rules in Order

1. Follow the user's explicit requirements.
2. Follow the repository's Nuxt/Vue configuration, formatter, linter, build, package-manager, browser-target, and established local conventions.
3. Apply this skill's Nuxt 4 frontend boundaries, source ownership, SSR/hydration, and generated-output invariants.
4. Use current official Nuxt 4 guidance and the remaining rules in this skill as fallbacks.

## Retrieve Current Nuxt Documentation

Treat Nuxt prerequisites, CLI commands, directory conventions, and build behavior as version-sensitive. Read the relevant Nuxt 4 documentation before installing, upgrading, or quoting commands. Start with [Nuxt 4 installation](https://nuxt.com/docs/4.x/getting-started/installation).

## Coordinate Companion Skills

Companion skills are optional specializations. Complete Nuxt work from this skill and current official Nuxt conventions when another named skill is unavailable.

- Apply `frontend-vue-style-guide` to Vue components, templates, props, emits, and reactivity.
- Apply `frontend-javascript-style-guide` only to browser JavaScript. Do not apply browser-only
  rules to `nuxt.config.js`, `nuxt.config.mjs`, `app.config.js`, or other framework configuration;
  follow current Nuxt documentation and the repository's configuration conventions there.
- Apply `frontend-style-guide` to HTML, CSS, preprocessors, SCSS nesting, and source-versus-generated output.
- Apply `frontend-bem-css` when the project uses BEM.
- Apply `frontend-responsive-mobile-first` to responsive and container-query behavior.
- Apply `frontend-web-performance` when measuring SSR output, hydration, bundles, or Core Web Vitals.

## Inspect Before Changing

1. Read `package.json`, the lockfile, Nuxt configuration, and existing build scripts.
2. Confirm the installed Nuxt major version. Do not silently migrate Nuxt 2 or 3 to Nuxt 4.
3. Preserve the active package manager, lockfile, runtime version, and exact canonical build command. Do not mix package managers, update a lockfile, change the runtime, or replace the build command unless the task requires it.
4. Confirm the current Node.js prerequisite in the official installation page.
5. Preserve JavaScript source. Do not introduce TypeScript or `lang="ts"`.

## Install or Initialize

- For a new project, use the current official `create nuxt` command for the selected package manager.
- For an existing project, install or update only what the requested change requires; never run the project initializer over it.
- Use `nuxt.config.js` or `nuxt.config.mjs` and `app/app.config.js` for this JavaScript-only skill.
- Run the generated development script and verify the initial page before adding features.
- Do not add modules until their purpose, Nuxt 4 compatibility, client/server behavior, and bundle impact are understood.

## Use Nuxt 4 Source Structure

- Treat `app/` as the source directory. Do not create a parallel `src/` merely to satisfy a generic convention.
- Put reusable Vue UI in `app/components/` and let Nuxt auto-import it.
- Put route views in `app/pages/`, shared wrappers in `app/layouts/`, browser composables in `app/composables/`, navigation middleware in `app/middleware/`, client-compatible plugins in `app/plugins/`, and processed styles/assets in `app/assets/`.
- Put files that must keep a stable public URL and filename in `public/`.
- Keep `app/app.vue` as the root view and use `<NuxtPage />` or `<NuxtLayout>` only when the selected view structure needs them.
- Use file and component names that make their auto-imported names predictable.

Do not edit `.nuxt/`; Nuxt regenerates it during development. Do not edit `.output/`; Nuxt regenerates it during production builds.

## Build Views and Navigation

- Use Nuxt file-based routing instead of maintaining a parallel router table.
- Use `<NuxtLink>` for internal navigation and semantic anchors for external destinations.
- Keep page components focused on route-level orchestration; extract reusable UI and behavior into components and composables.
- Use a layout only when multiple pages share a persistent wrapper. Keep a single simple shell in `app/app.vue` when no layout variation exists.
- Keep route-dependent browser effects inside appropriate Vue/Nuxt lifecycle boundaries.

## Fetch Data Without Hydration Duplication

- Use `useFetch` for common SSR-safe requests and `useAsyncData` for custom async logic needed for initial rendering.
- Use `$fetch` for event-driven client interactions or inside an appropriate `useAsyncData` handler.
- Handle `status`, `error`, empty data, and retry or refresh behavior explicitly.
- Use stable keys when data must be shared or cached across components.
- Reduce serialized payload with `pick` or `transform` when only part of a response is rendered.
- Do not access browser-only globals during server rendering. Isolate them behind client lifecycle hooks or a narrowly scoped client-only boundary.
- Keep server and client initial markup deterministic to prevent hydration mismatches.

## Style Nuxt Applications

- Put processed global styles and preprocessor sources under `app/assets/`.
- Register global styles through the Nuxt `css` configuration or import them from the application shell according to project convention.
- Install only the selected preprocessor implementation and preserve its syntax.
- Apply readable SCSS nesting with `&__element`, `&--modifier`, states, pseudo-selectors, and colocated at-rules; inspect the generated CSS.
- Use `<style scoped>` or another documented component-scoping strategy for local styles.
- Keep unprocessed stable assets in `public/`, not `app/assets/`.

## Generate and Verify Compiled Output

- Keep `app/`, `public/`, JavaScript configuration, and stylesheet sources as the editable source of truth.
- Run the existing Nuxt production build after each coherent source change set and always before handoff when code changed; do not rebuild after every individual file edit unless the toolchain requires it.
- Use the Nuxt generate/prerender command when the requested deliverable is static, then verify `.output/public/`.
- Let Nuxt control chunk names, hashes, CSS extraction, manifests, and minification.
- Never hand-edit `.nuxt/`, `.output/`, generated chunks, or compiled CSS.
- Keep generated directories ignored when that is the repository policy, but still build and inspect them locally before handoff.
- Treat compilation as required. If it fails, report the exact command and error rather than fabricating output.
- After the final build, rerun the canonical build once with unchanged source when feasible. Require no unexplained tracked diff; compare routes, manifests, chunks, and rendered behavior rather than promising byte equality when hashes or timestamps can vary.

Read [references/nuxt-4-frontend.md](references/nuxt-4-frontend.md) when installing a project, choosing directories, configuring JavaScript-only Nuxt, writing SSR-safe data flows, adding SCSS, or producing `.output/`.

## Verify the Application

- Run available verification in this order: formatter, linter, focused tests, canonical build,
  generated-output inspection, then visual and accessibility checks. Use the repository's
  Vue/Nuxt-aware linter, test targets, and production build command.
- Run the development server when interactive visual or accessibility verification requires it.
- Check routes, direct navigation, loading/error states, hydration warnings, responsive behavior, and accessible markup.
- Review source changes separately from generated output.
- If a check cannot run, report its exact command, the blocking reason, and what remains unverified.

## Primary Sources

- [Nuxt 4 installation](https://nuxt.com/docs/4.x/getting-started/installation)
- [Nuxt 4 directory structure](https://nuxt.com/docs/4.x/directory-structure)
- [Nuxt 4 views](https://nuxt.com/docs/4.x/getting-started/views)
- [Nuxt 4 styling](https://nuxt.com/docs/4.x/getting-started/styling)
- [Nuxt 4 data fetching](https://nuxt.com/docs/4.x/getting-started/data-fetching)
- [Nuxt 4 deployment](https://nuxt.com/docs/4.x/getting-started/deployment)
