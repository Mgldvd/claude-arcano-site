<script setup>
const { message } = useCopy()
</script>

<template>
  <div
    class="copy-toast"
    :class="{ 'copy-toast--shown': message }"
    role="status"
  >
    {{ message }}
  </div>
</template>

<style lang="scss" scoped>
.copy-toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translate(-50%, 12px);
  padding: 8px 14px;
  border: 1px solid var(--ink);
  background: var(--paper);
  font: 500 12px/1 var(--mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s, transform 0.2s;

  &--shown {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}
</style>
