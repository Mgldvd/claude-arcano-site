<script setup>
definePageMeta({ sheet: 'Sheet 02 / 03 — Mods' })

const route = useRoute()
const site = useSite()
const mod = site.mods.items.find(m => m.name === route.params.name)
if (!mod) throw createError({ statusCode: 404, statusMessage: 'No mod by that name', fatal: true })

const item = { name: mod.name, title: mod.name, description: mod.description, files: mod.files, firstFile: mod.firstFile }

useSeoMeta({
  title: `${mod.name} — Mods — ${site.host}`,
  description: mod.description,
  ogTitle: `${mod.name} — ${site.host}`,
  ogDescription: mod.description,
  ogUrl: `${site.site}/mods/${mod.name}`,
})
useHead({ link: [{ rel: 'canonical', href: `${site.site}/mods/${mod.name}` }] })
</script>

<template>
  <CodeBrowser kind="mods" :item="item" back-to="/mods" back-label="Mods" />
</template>
