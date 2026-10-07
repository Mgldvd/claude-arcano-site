<script setup>
// One level of the file tree: folders first (open), then files, each file a link that opens it.
defineProps({
  nodes: {
    type: Array,
    required: true,
  },
  selected: {
    type: String,
    required: true,
  },
  depth: {
    type: Number,
    default: 0,
  },
})
</script>

<template>
  <ul class="file-tree" :style="{ '--depth': depth }">
    <li v-for="node in nodes" :key="node.path" class="file-tree__node">
      <details v-if="node.children" class="file-tree__folder" open>
        <summary class="file-tree__row file-tree__row--folder">
          <span class="file-tree__icon" aria-hidden="true">▸</span>{{ node.name }}
        </summary>
        <FileTree :nodes="node.children" :selected="selected" :depth="depth + 1" />
      </details>
      <NuxtLink
        v-else
        class="file-tree__row file-tree__row--file"
        :class="{ 'file-tree__row--current': node.path === selected }"
        :to="{ query: { file: node.path } }"
        :aria-current="node.path === selected ? 'true' : undefined"
        replace
      >
        {{ node.name }}
      </NuxtLink>
    </li>
  </ul>
</template>

<style lang="scss" scoped>
.file-tree {
  margin: 0;
  padding: 0;
  list-style: none;

  &__row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 12px 3px calc(14px + var(--depth) * 14px);
    border: 1px solid transparent;
    color: var(--ink);
    font: 400 13px/1.5 var(--mono);
    text-decoration: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;

    &:hover {
      background: var(--wash);
    }

    &--folder {
      list-style: none;
      color: var(--ink-strong);
      font-weight: 500;

      &::-webkit-details-marker {
        display: none;
      }
    }

    &--file {
      padding-left: calc(30px + var(--depth) * 14px);
    }

    &--current {
      border-color: var(--line);
      border-left-color: var(--ink);
      background: var(--wash);
      color: var(--ink-strong);
    }
  }

  &__icon {
    display: inline-block;
    width: 10px;
    font-size: 10px;
    transition: transform 0.15s;
  }

  &__folder[open] > .file-tree__row .file-tree__icon {
    transform: rotate(90deg);
  }
}
</style>
