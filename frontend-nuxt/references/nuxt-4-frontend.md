# Nuxt 4 Frontend Reference

Use this reference only for Nuxt 4 frontend work with Vue, HTML, browser JavaScript, CSS, and supported preprocessors. Do not add TypeScript or backend/Nitro code.

## Contents

- [Installation](#installation)
- [JavaScript-only configuration](#javascript-only-configuration)
- [Source structure](#source-structure)
- [Views and routing](#views-and-routing)
- [Data and hydration](#data-and-hydration)
- [Assets and SCSS](#assets-and-scss)
- [Generated output](#generated-output)

## Installation

Check the [current Nuxt 4 installation page](https://nuxt.com/docs/4.x/getting-started/installation) before running commands. Verify the current Node.js prerequisite and supported initializer syntax rather than encoding a documentation snapshot in project automation. Common initializer forms include:

```text
npm create nuxt@latest <project-name>
pnpm create nuxt@latest <project-name>
yarn create nuxt <project-name>
bun create nuxt@latest <project-name>
deno -A npm:create-nuxt@latest <project-name>
```

Use exactly one package manager. Preserve the selected lockfile, supported runtime version, and generated package scripts; do not refresh or replace them unless the task requires it. After scaffolding, inspect the generated files, keep application code in JavaScript, start the provided development script, and verify the initial page.

The official `@latest` commands intentionally resolve over time. Use them only when the user asks for the current Nuxt scaffold, then record the resolved initializer/Nuxt versions and preserve the generated lockfile. For reproducible automation or a rerunnable script, replace `@latest` with the exact verified initializer version instead of relying on a moving tag.

Do not scaffold inside a non-empty existing application. Detect its Nuxt version and follow the matching upgrade guide when migration is explicitly requested.

## JavaScript-only Configuration

Nuxt accepts `.js`, `.mjs`, or `.ts` configuration extensions. Use JavaScript here:

```js
export default defineNuxtConfig({
  css: ['~/assets/scss/main.scss'],
  runtimeConfig: {
    public: {
      apiBase: '',
    },
  },
});
```

Use `nuxt.config.js` or `nuxt.config.mjs` at the project root. Use `app/app.config.js` for public build-time application values. Never place secrets in `app.config` or `runtimeConfig.public`, because client-visible values reach the browser.

Keep Vite, PostCSS, and Nuxt build options inside `nuxt.config` when Nuxt owns those integrations. Avoid creating parallel configuration files that Nuxt ignores.

## Source Structure

Use Nuxt 4's `app/` directory as the source tree:

```text
app/
├── app.vue
├── assets/
│   └── scss/
│       └── main.scss
├── components/
├── composables/
├── layouts/
├── middleware/
├── pages/
├── plugins/
└── utils/
public/
nuxt.config.js
package.json
```

- Use `app/components/` for auto-imported Vue components.
- Use `app/composables/` for auto-imported `use...` browser composables.
- Use `app/pages/` for file-based routes.
- Use `app/layouts/` only for shared page shells.
- Use `app/plugins/` for Vue/Nuxt client-compatible plugin registration.
- Use `app/assets/` for files processed by Vite or webpack.
- Use `public/` for unprocessed files served from stable root URLs.
- Do not create `server/` files under this frontend-only skill.

## Views and Routing

Keep the root explicit:

```vue
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

Omit `<NuxtLayout>` when the application has no layout variation. Use `<NuxtLink>` for internal links so Nuxt can apply its routing behavior.

Let filenames express route structure. Keep reusable page sections in components instead of duplicating them across route files.

## Data and Hydration

Use SSR-safe fetching for initial page data:

This example assumes that `public/content/posts.json` contains an object with a
`posts` array, so Nuxt serves it at `/content/posts.json` without processing it.

```vue
<script setup>
const {
  data: content,
  error,
  status,
} = await useFetch('/content/posts.json', {
  key: 'posts',
  pick: ['posts'],
});
</script>

<template>
  <p v-if="status === 'pending'">Loading…</p>
  <p v-else-if="error">Unable to load posts.</p>
  <PostList
    v-else
    :posts="content?.posts || []"
  />
</template>
```

Use `$fetch` for user-triggered actions. Use `useAsyncData` when the async function is more complex than a normal request. Do not perform side effects inside an async-data handler.

Keep server-rendered and hydrated markup deterministic. Avoid direct `window`, `document`, storage, random values, and current-time rendering during SSR. Use `onMounted`, client-only plugins, or `<ClientOnly>` only for genuinely browser-dependent behavior.

Use lazy components or delayed hydration only for non-critical UI and verify the actual bundle and interaction benefit.

## Assets and SCSS

Install the selected preprocessor as a development dependency. For SCSS, keep source in `app/assets/scss/` and use Sass modules:

```scss
.site-card {
  display: grid;

  &__title {
    font-weight: 700;
  }

  &--featured {
    border-color: var(--color-accent);
  }

  @media (min-width: 768px) {
    grid-template-columns: 1fr auto;
  }
}
```

Prefer `@use` and `@forward` over deprecated Sass `@import`. Keep nesting shallow and inspect emitted selectors. Use component-scoped styles for local CSS and global entry styles only for tokens, foundations, layouts, and intentional utilities.

Put stable files such as `robots.txt` and favicons in `public/`. Put images, fonts, and styles that need processing or hashing under `app/assets/`.

## Generated Output

- Treat `.nuxt/` as generated development output and never edit it.
- Treat `.output/` as generated production output and never edit it.
- Run the existing package script that invokes `nuxt build` after each coherent source change set and before handoff, not after every individual file edit.
- Run the package script that invokes `nuxt generate` or `nuxt build --prerender` for a static deliverable.
- Verify static files under `.output/public/`.
- Preserve ignore rules for generated directories while still compiling locally.
- Trace every generated warning or defect back to `app/`, `public/`, configuration, or dependencies.
- With source and configuration unchanged, rerun the canonical build once when feasible and require no unexplained tracked diff. Compare routes, manifests, chunks, and behavior rather than byte equality when hashes or timestamps can vary.

Primary documentation:

- [Installation](https://nuxt.com/docs/4.x/getting-started/installation)
- [Directory structure](https://nuxt.com/docs/4.x/directory-structure)
- [`nuxt.config`](https://nuxt.com/docs/4.x/directory-structure/nuxt-config)
- [`app.config`](https://nuxt.com/docs/4.x/directory-structure/app/app-config)
- [`.nuxt/`](https://nuxt.com/docs/4.x/directory-structure/nuxt)
- [`.output/`](https://nuxt.com/docs/4.x/directory-structure/output)
- [Assets](https://nuxt.com/docs/4.x/getting-started/assets)
- [Styling](https://nuxt.com/docs/4.x/getting-started/styling)
- [Data fetching](https://nuxt.com/docs/4.x/getting-started/data-fetching)
- [Prerendering](https://nuxt.com/docs/4.x/getting-started/prerendering)
