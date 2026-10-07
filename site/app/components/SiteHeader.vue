<script setup>
defineProps({
  sheet: {
    type: String,
    default: '',
  },
})

const { host } = useSite()
const route = useRoute()
const pages = [
  { to: '/', label: 'Home' },
  { to: '/mods', label: 'Mods' },
  { to: '/skills', label: 'Skills' },
]
</script>

<template>
  <header class="site-header">
    <div class="site-header__bar">
      <NuxtLink class="site-header__brand" to="/">
        <SiteLogo />
        <span>{{ host }}</span>
      </NuxtLink>
      <nav class="site-header__nav" aria-label="Main">
        <NuxtLink
          v-for="page in pages"
          :key="page.to"
          class="site-header__link"
          :class="{ 'site-header__link--section': page.to !== '/' && route.path.startsWith(`${page.to}/`) }"
          :to="page.to"
        >
          {{ page.label }}
        </NuxtLink>
        <a class="site-header__link" href="/install.md">For agents</a>
      </nav>
    </div>
    <div class="site-header__stamp">
      <span>{{ sheet }}</span>
      <span class="site-header__subject">Mods &amp; skills for Claude Code</span>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.site-header {
  &__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 20px 0;
    border-bottom: 1px solid var(--line);

    @media (max-width: 640px) {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  &__brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: var(--ink);
    text-decoration: none;
    font: 500 15px/1 var(--mono);
    letter-spacing: 0.02em;
  }

  &__nav {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    font: 400 13px/1 var(--mono);
    text-transform: uppercase;
    letter-spacing: 0.1em;

    @media (max-width: 640px) {
      margin-left: -10px;
    }
  }

  &__link {
    padding: 8px 10px;
    color: var(--ink);
    text-decoration: none;
    border: 1px solid transparent;

    &:hover {
      border-color: var(--line);
      border-style: dashed;
    }

    &[aria-current='page'],
    &--section {
      border-color: var(--ink);
      border-style: solid;
    }
  }

  &__stamp {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid var(--line-faint);
    font: 400 11px/1.4 var(--mono);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }

  &__subject {
    @media (max-width: 640px) {
      display: none;
    }
  }
}
</style>
