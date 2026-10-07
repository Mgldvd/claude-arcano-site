<script setup>
// The agent guide, rendered from install.md at build time. Its code blocks carry a Copy
// button (data-copy-next) that copies the block right after it.
defineProps({
  html: {
    type: String,
    required: true,
  },
})

const { copy } = useCopy()

function onClick(event) {
  const button = event.target.closest('[data-copy-next]')
  if (button) copy(button.nextElementSibling.textContent)
}
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- built from our own install.md at build time -->
  <div class="agent-guide" @click="onClick" v-html="html" />
</template>

<style lang="scss" scoped>
.agent-guide {
  max-width: 760px;

  :deep(h2) {
    margin: 0 0 16px;
  }

  :deep(h3) {
    margin: 36px 0 12px;
    padding-top: 18px;
    border-top: 1px dashed var(--line-faint);
  }

  :deep(ul),
  :deep(ol) {
    margin: 0 0 1em;
    padding-left: 1.4em;
  }

  :deep(li) {
    margin: 0.3em 0;
  }

  :deep(li::marker) {
    color: var(--ink-soft);
    font-family: var(--mono);
  }

  :deep(blockquote) {
    margin: 0 0 1em;
    padding: 12px 16px;
    border-left: 2px solid var(--ink);
    background: var(--wash);
    color: var(--ink-strong);

    p:last-child {
      margin: 0;
    }
  }

  :deep(.code) {
    position: relative;
    margin: 0 0 1.2em;
    border: 1px solid var(--line);

    pre {
      margin: 0;
      padding: 14px 16px;
      overflow-x: auto;
      background: var(--wash);
      font-size: 13px;
      line-height: 1.6;
      color: var(--ink-strong);
    }

    pre code {
      padding: 0;
      border: 0;
      background: none;
      font-size: inherit;
      word-break: normal;
    }

    .button {
      position: absolute;
      top: 6px;
      right: 6px;
    }
  }
}
</style>
