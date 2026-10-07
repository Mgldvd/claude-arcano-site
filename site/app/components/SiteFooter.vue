<script setup>
const { host } = useSite()
</script>

<template>
  <footer class="site-footer">
    <span>{{ host }} · drawn by hand, scale 1:1</span>
    <nav class="site-footer__nav" aria-label="Machine-readable">
      <a href="/install.md">install.md</a>
      <a href="/llms.txt">llms.txt</a>
      <a href="/catalog.json">catalog.json</a>
    </nav>
  </footer>
</template>

<style lang="scss" scoped>
.site-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px 24px;
  margin-top: 24px;
  padding: 20px 0 40px;
  border-top: 1px solid var(--line);
  font: 400 12px/1.5 var(--mono);
  color: var(--ink-soft);

  &__nav {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
  }
}
</style>
