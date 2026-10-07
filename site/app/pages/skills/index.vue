<script setup>
definePageMeta({ sheet: 'Sheet 03 / 03 — Skills' })

const site = useSite()
const { families, items } = site.skills
const groups = families.map(name => ({
  name,
  skills: items.filter(skill => skill.family === name).map(skill => ({ id: skill.name, title: skill.title, text: skill.summary, to: `/skills/${skill.name}` })),
}))
const description = 'Agent skills: folders with a SKILL.md that teach an agent a job.'

useSeoMeta({
  title: `Skills — ${site.host}`,
  description,
  ogTitle: `Skills — ${site.host}`,
  ogDescription: description,
  ogUrl: `${site.site}/skills`,
})
useHead({ link: [{ rel: 'canonical', href: `${site.site}/skills` }] })
</script>

<template>
  <div class="catalog-page">
    <h1 class="visually-hidden">Skills</h1>
    <CatalogList
      v-for="group in groups"
      :key="group.name"
      :label="`${group.name} · ${group.skills.length}`"
      :items="group.skills"
    />
    <p class="note">
      To install them, give your agent the <NuxtLink to="/#prompt">prompt on the home page</NuxtLink>.
    </p>
  </div>
</template>
