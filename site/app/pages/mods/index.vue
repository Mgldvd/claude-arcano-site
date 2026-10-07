<script setup>
definePageMeta({ sheet: 'Sheet 02 / 03 — Mods' })

const site = useSite()
const mods = site.mods.items.map(mod => ({ id: mod.name, title: mod.name, text: mod.description, to: `/mods/${mod.name}` }))
const description = 'Claude Code plugins built on hooks: panes, bands, switches and a calmer view.'

useSeoMeta({
  title: `Mods — ${site.host}`,
  description,
  ogTitle: `Mods — ${site.host}`,
  ogDescription: description,
  ogUrl: `${site.site}/mods`,
})
useHead({ link: [{ rel: 'canonical', href: `${site.site}/mods` }] })
</script>

<template>
  <div class="catalog-page">
    <h1 class="visually-hidden">Mods</h1>
    <CatalogList :label="`Mods · ${mods.length}`" :items="mods" />
    <p class="note">
      To install them, give your agent the <NuxtLink to="/#prompt">prompt on the home page</NuxtLink>.
    </p>
  </div>
</template>
