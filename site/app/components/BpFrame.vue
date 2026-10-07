<script setup>
// A wireframe box with crop marks at its corners and its label set into the top line.
defineProps({
  label: {
    type: String,
    default: '',
  },
  as: {
    type: String,
    default: 'section',
  },
  to: {
    type: String,
    default: '',
  },
  dashed: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    class="bp-frame bp-frame--link"
    :class="{ 'bp-frame--dashed': dashed }"
    :data-label="label || null"
  >
    <slot />
  </NuxtLink>
  <component
    :is="as"
    v-else
    class="bp-frame"
    :class="{ 'bp-frame--dashed': dashed }"
    :data-label="label || null"
  >
    <slot />
  </component>
</template>

<style lang="scss" scoped>
$mark: linear-gradient(var(--ink), var(--ink));

.bp-frame {
  position: relative;
  display: block;
  padding: 24px;
  border: 1px solid var(--line);
  background: var(--paper);
  color: inherit;

  &::after {
    content: '';
    position: absolute;
    inset: -5px;
    pointer-events: none;
    background:
      $mark top left / 11px 1px no-repeat,
      $mark top left / 1px 11px no-repeat,
      $mark top right / 11px 1px no-repeat,
      $mark top right / 1px 11px no-repeat,
      $mark bottom left / 11px 1px no-repeat,
      $mark bottom left / 1px 11px no-repeat,
      $mark bottom right / 11px 1px no-repeat,
      $mark bottom right / 1px 11px no-repeat;
  }

  &[data-label]::before {
    content: attr(data-label);
    position: absolute;
    top: -0.75em;
    left: 16px;
    padding: 0 8px;
    background: var(--paper);
    font: 500 11px/1.4 var(--mono);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink);
  }

  &--dashed {
    border-style: dashed;
  }

  &--link {
    text-decoration: none;
    transition: background 0.15s;

    &:hover {
      background: var(--wash);
    }
  }

  @media (max-width: 640px) {
    padding: 18px;
  }
}
</style>
