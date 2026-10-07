<script setup>
// One wireframe box holding a list: a title and a description per row, each row a link to
// the item's code.
defineProps({
  label: {
    type: String,
    required: true,
  },
  items: {
    type: Array,
    required: true,
  },
})
</script>

<template>
  <BpFrame class="catalog-list" :label="label">
    <ul class="catalog-list__items">
      <li
        v-for="item in items"
        :id="item.id"
        :key="item.id"
        class="catalog-list__entry"
      >
        <NuxtLink class="catalog-list__item" :to="item.to">
          <h3 class="catalog-list__title">
            {{ item.title }}<span class="catalog-list__go" aria-hidden="true"> →</span>
          </h3>
          <p class="catalog-list__text">{{ item.text }}</p>
        </NuxtLink>
      </li>
    </ul>
  </BpFrame>
</template>

<style lang="scss" scoped>
.bp-frame.catalog-list {
  padding: 6px 0;
}

.catalog-list {
  &__items {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__entry + &__entry {
    border-top: 1px dashed var(--line-faint);
  }

  &__item {
    display: grid;
    grid-template-columns: minmax(0, 15rem) minmax(0, 1fr);
    gap: 4px 32px;
    align-items: baseline;
    padding: 14px 24px;
    color: inherit;
    text-decoration: none;
    transition: background 0.15s;

    &:hover {
      background: var(--wash);
    }

    &:hover .catalog-list__go {
      opacity: 1;
    }

    @media (max-width: 640px) {
      grid-template-columns: minmax(0, 1fr);
      padding: 12px 18px;
    }
  }

  &__title {
    font-size: 16px;
    line-height: 1.4;
  }

  &__go {
    opacity: 0;
    transition: opacity 0.15s;
  }

  &__text {
    margin: 0;
    font-size: 15px;
    line-height: 1.5;
    color: var(--ink-soft);
  }
}
</style>
