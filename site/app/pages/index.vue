<script setup>
definePageMeta({ sheet: 'Sheet 01 / 03 — General arrangement' })

const site = useSite()
const ask = `Read ${site.site} and follow its instructions for AI agents to install the mods and skills.`
const description = `${site.mods.items.length} Claude Code mods and ${site.skills.items.length} agent skills. Point your agent at this page and it offers to install them.`

useSeoMeta({
  title: `${site.host} — mods & skills for Claude Code`,
  description,
  ogTitle: `${site.host} — mods & skills for Claude Code`,
  ogDescription: description,
  ogUrl: `${site.site}/`,
})
useHead({ link: [{ rel: 'canonical', href: `${site.site}/` }] })
</script>

<template>
  <div>
    <h1 class="visually-hidden">Mods &amp; skills for Claude Code</h1>

    <BpFrame id="prompt" class="home-prompt" label="Spec. A — Paste this into your agent">
      <p class="home-prompt__text">{{ ask }}</p>
      <div class="home-prompt__row">
        <p class="note">Works with Claude Code and other agents that can read the web and run a shell.</p>
        <CopyButton :text="ask" label="Copy prompt" />
      </div>
    </BpFrame>

    <section class="page-section">
      <div class="card-grid card-grid--wide">
        <BpFrame class="home-tile" to="/mods" label="Fig. 01 — Mods">
          <SketchMods />
          <h2>Mods</h2>
          <p class="note">
            Claude Code plugins built on hooks: side panes, bands above the prompt, one-click
            switches, a calmer view.
          </p>
          <span class="home-tile__go">{{ site.mods.items.length }} mods →</span>
        </BpFrame>
        <BpFrame class="home-tile" to="/skills" label="Fig. 02 — Skills">
          <SketchSkills />
          <h2>Skills</h2>
          <p class="note">
            Folders with a SKILL.md that teach an agent a job: frontend style, CLI design,
            agentic workflows, project memory.
          </p>
          <span class="home-tile__go">{{ site.skills.items.length }} skills →</span>
        </BpFrame>
      </div>
    </section>

    <section id="agents" class="page-section">
      <BpFrame as="div" label="Spec. B — For AI agents" dashed>
        <AgentGuide :html="site.guideHtml" />
        <p class="note">
          The full catalog, with a checksum for every archive, is in
          <a href="/install.md">install.md</a> and <a href="/catalog.json">catalog.json</a>.
        </p>
      </BpFrame>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.home-prompt {
  display: grid;
  gap: 14px;

  > * {
    min-width: 0;
  }

  &__text {
    margin: 0;
    padding: 16px 18px;
    border: 1px dashed var(--line);
    background: var(--wash);
    font: 400 15px/1.55 var(--mono);
    color: var(--ink-strong);
    white-space: pre-wrap;
    word-break: break-word;
  }

  &__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
}

.home-tile {
  display: grid;
  gap: 12px;
  align-content: start;

  &__go {
    font: 500 12px/1 var(--mono);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
}
</style>
