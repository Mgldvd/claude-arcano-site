<script setup>
// A mod or skill as a code editor shows it: its files as a tree on the left, the open file
// with line numbers on the right. The open file is ?file= in the address, so a link to a
// file works; the files themselves are served as plain text from /source/<kind>/<name>/.
const props = defineProps({
  kind: {
    type: String,
    required: true,
  },
  item: {
    type: Object,
    required: true,
  },
  backTo: {
    type: String,
    required: true,
  },
  backLabel: {
    type: String,
    required: true,
  },
})

const route = useRoute()
const { highlight } = useHighlight()

const tree = buildTree(props.item.files)
const selected = ref(props.item.firstFile)
const file = computed(() => props.item.files.find(f => f.path === selected.value))
const url = computed(() => `/source/${props.kind}/${props.item.name}/${selected.value.split('/').map(encodeURIComponent).join('/')}`)

// Read in the browser: the prerender has no static files to fetch from.
const { data: text, status } = useAsyncData(
  () => `source:${props.kind}:${props.item.name}:${selected.value}`,
  () => (file.value?.type === 'text' ? $fetch(url.value, { responseType: 'text' }) : Promise.resolve('')),
  { server: false },
)

const lineCount = computed(() => (text.value ? text.value.replace(/\n$/, '').split('\n').length : 0))
const highlighted = ref(null)

// The address picks the file only once the page is live, so the first paint matches the
// prerendered one; colors come after, for the same reason.
onMounted(() => {
  watch(
    () => route.query.file,
    path => {
      const wanted = typeof path === 'string' && props.item.files.some(f => f.path === path) ? path : props.item.firstFile
      selected.value = wanted
    },
    { immediate: true },
  )
  watch(
    [text, selected],
    async ([value, path]) => {
      highlighted.value = null
      if (!value) return
      const html = await highlight(value, path)
      if (path === selected.value && value === text.value) highlighted.value = html
    },
    { immediate: true },
  )
})

function buildTree(files) {
  const root = []
  for (const f of files) {
    const parts = f.path.split('/')
    let level = root
    parts.forEach((name, i) => {
      const path = parts.slice(0, i + 1).join('/')
      if (i === parts.length - 1) {
        level.push({ name, path })
        return
      }
      let folder = level.find(node => node.children && node.name === name)
      if (!folder) {
        folder = { name, path, children: [] }
        level.push(folder)
      }
      level = folder.children
    })
  }
  const sort = nodes => {
    nodes.sort((a, b) => Boolean(b.children) - Boolean(a.children) || a.name.localeCompare(b.name))
    nodes.forEach(node => node.children && sort(node.children))
    return nodes
  }
  return sort(root)
}

function size(bytes) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
}
</script>

<template>
  <div class="code-browser">
    <header class="code-browser__head">
      <p class="code-browser__crumbs">
        <NuxtLink :to="backTo">{{ backLabel }}</NuxtLink>
        <span aria-hidden="true">/</span>
        <span>{{ item.name }}</span>
      </p>
      <h1 class="code-browser__title">{{ item.title }}</h1>
      <p class="code-browser__text">{{ item.description }}</p>
    </header>

    <BpFrame as="div" class="code-browser__frame" :label="`${item.files.length} files`">
      <nav class="code-browser__tree" aria-label="Files">
        <FileTree :nodes="tree" :selected="selected" />
      </nav>

      <section class="code-browser__view" :aria-label="selected">
        <div class="code-browser__tab">
          <span class="code-browser__path">{{ selected }}</span>
          <span v-if="file" class="code-browser__meta">
            <span v-if="lineCount">{{ lineCount }} lines · </span>{{ size(file.bytes) }}
            <template v-if="file.type !== 'binary'"> · <a :href="url" target="_blank" rel="noopener">raw</a></template>
          </span>
        </div>

        <div v-if="file?.type === 'image'" class="code-browser__image">
          <img :src="url" :alt="selected">
        </div>
        <p v-else-if="file?.type === 'binary'" class="code-browser__empty">Binary file, not shown.</p>
        <p v-else-if="status === 'error'" class="code-browser__empty">Could not load this file.</p>
        <p v-else-if="text == null" class="code-browser__empty">Loading…</p>
        <div v-else class="code-browser__code" :class="{ 'code-browser__code--loading': status === 'pending' }">
          <ol class="code-browser__gutter" aria-hidden="true">
            <li v-for="n in lineCount" :key="n">{{ n }}</li>
          </ol>
          <!-- eslint-disable-next-line vue/no-v-html -- highlight.js escapes the file's text -->
          <pre v-if="highlighted" class="code-browser__pre"><code class="hljs" v-html="highlighted" /></pre>
          <pre v-else class="code-browser__pre"><code>{{ text }}</code></pre>
        </div>
      </section>
    </BpFrame>
  </div>
</template>

<style lang="scss" scoped>
.code-browser {
  display: grid;
  gap: 32px;
  padding-bottom: 48px;

  &__head {
    display: grid;
    gap: 6px;
  }

  &__crumbs {
    display: flex;
    gap: 8px;
    margin: 0;
    font: 400 12px/1.5 var(--mono);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }

  &__title {
    font-size: 28px;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }

  &__text {
    max-width: 760px;
    margin: 0;
    color: var(--ink-soft);
  }

  &__frame.bp-frame {
    display: grid;
    grid-template-columns: minmax(0, 15rem) minmax(0, 1fr);
    height: min(78vh, 860px);
    padding: 0;

    @media (max-width: 760px) {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto minmax(0, 1fr);
      height: auto;
    }
  }

  &__tree {
    padding: 14px 0;
    border-right: 1px dashed var(--line);
    overflow: auto;

    @media (max-width: 760px) {
      max-height: 240px;
      border-right: 0;
      border-bottom: 1px dashed var(--line);
    }
  }

  &__view {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }

  &__tab {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 4px 16px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--line-faint);
    font: 400 12px/1.5 var(--mono);
  }

  &__path {
    color: var(--ink-strong);
    font-weight: 500;
    word-break: break-all;
  }

  &__meta {
    color: var(--ink-soft);
    white-space: nowrap;
  }

  &__code {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: auto;
    font: 400 13px/1.65 var(--mono);
    transition: opacity 0.15s;

    &--loading {
      opacity: 0.4;
    }

    @media (max-width: 760px) {
      max-height: 70vh;
    }
  }

  &__gutter {
    position: sticky;
    left: 0;
    flex: none;
    margin: 0;
    padding: 12px 10px 12px 14px;
    list-style: none;
    border-right: 1px dashed var(--line-faint);
    background: var(--paper);
    color: var(--line);
    text-align: right;
    user-select: none;
  }

  &__pre {
    flex: 1;
    margin: 0;
    padding: 12px 16px;
    color: var(--ink-strong);
    font: inherit;
    tab-size: 2;

    code {
      padding: 0;
      border: 0;
      background: none;
      font: inherit;
      word-break: normal;
    }
  }

  &__image {
    display: grid;
    flex: 1;
    place-items: center;
    padding: 24px;
    overflow: auto;

    img {
      max-width: 100%;
      height: auto;
      border: 1px dashed var(--line);
    }
  }

  &__empty {
    margin: 0;
    padding: 24px 16px;
    font: 400 13px/1.5 var(--mono);
    color: var(--ink-soft);
  }

  // Syntax colors, in the blueprint's blues.
  :deep(.hljs-comment),
  :deep(.hljs-quote) {
    color: rgba(23, 71, 166, 0.5);
    font-style: italic;
  }

  :deep(.hljs-keyword),
  :deep(.hljs-selector-tag),
  :deep(.hljs-section),
  :deep(.hljs-name) {
    color: #0a2a6e;
    font-weight: 500;
  }

  :deep(.hljs-string),
  :deep(.hljs-regexp),
  :deep(.hljs-template-tag),
  :deep(.hljs-code) {
    color: #2f6fe0;
  }

  :deep(.hljs-number),
  :deep(.hljs-literal),
  :deep(.hljs-symbol),
  :deep(.hljs-bullet) {
    color: #5b4fd6;
  }

  :deep(.hljs-title),
  :deep(.hljs-title.function_),
  :deep(.hljs-built_in),
  :deep(.hljs-type) {
    color: #1747a6;
    font-weight: 500;
  }

  :deep(.hljs-attr),
  :deep(.hljs-attribute),
  :deep(.hljs-property),
  :deep(.hljs-variable),
  :deep(.hljs-params) {
    color: #3a5a9e;
  }

  :deep(.hljs-meta),
  :deep(.hljs-link) {
    color: rgba(23, 71, 166, 0.7);
  }

  :deep(.hljs-emphasis) {
    font-style: italic;
  }

  :deep(.hljs-strong) {
    font-weight: 600;
  }
}
</style>
