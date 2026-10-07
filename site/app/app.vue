<script setup>
const route = useRoute()
</script>

<template>
  <div class="sheet">
    <SiteHeader :sheet="route.meta.sheet" />
    <main>
      <NuxtPage />
    </main>
    <SiteFooter />
  </div>
  <CopyToast />
</template>

<style lang="scss">
.sheet {
  max-width: calc(var(--max) + 2 * var(--gutter));
  margin: 0 auto;
  padding: 0 var(--gutter);

  > main {
    padding-top: 40px;
  }
}
</style>
