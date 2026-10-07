<script setup>
definePageMeta({ sheet: 'Sheet 03 / 03 — Skills' })

const route = useRoute()
const site = useSite()
const skill = site.skills.items.find(s => s.name === route.params.name)
if (!skill) throw createError({ statusCode: 404, statusMessage: 'No skill by that name', fatal: true })

const item = { name: skill.name, title: skill.title, description: skill.summary, files: skill.files, firstFile: skill.firstFile }

useSeoMeta({
  title: `${skill.title} — Skills — ${site.host}`,
  description: skill.summary,
  ogTitle: `${skill.title} — ${site.host}`,
  ogDescription: skill.summary,
  ogUrl: `${site.site}/skills/${skill.name}`,
})
useHead({ link: [{ rel: 'canonical', href: `${site.site}/skills/${skill.name}` }] })
</script>

<template>
  <CodeBrowser kind="skills" :item="item" back-to="/skills" back-label="Skills" />
</template>
