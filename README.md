# claude.arcano.site

Nuxt 4 static site that hosts the Claude Code mods and agent skills, with a guide that lets an AI agent install them after asking the person. Served by a Cloudflare Worker as static assets at https://claude.arcano.site.

## Develop

```sh
pnpm install
pnpm dev                  # catalog, then nuxt dev
```

## Build and deploy

```sh
pnpm generate             # catalog, then nuxt generate → .output/public
pnpm preview              # wrangler dev: serves .output/public as Cloudflare will
pnpm deploy               # generate, then wrangler deploy (custom domain claude.arcano.site)
```

`scripts/catalog.mjs` runs before every build. It reads the sources and writes the generated, git-ignored files:

- `public/downloads/claude-mods.tar.gz`: the mods as a local marketplace
- `public/downloads/skills/<name>.tar.gz`, `public/downloads/skills-all.tar.gz`: the skills
- `public/catalog.json`: every mod and skill with its archive URL and sha256
- `public/install.md`, `public/llms.txt`: the agent guide as plain text
- `app/data/site.json`: what the pages draw

Sources (override with env vars):

| Variable     | Default                       |
| ------------ | ----------------------------- |
| `MODS_DIR`   | `~/Downloads/Claude-Mods`     |
| `SKILLS_DIR` | `~/Skills`                    |
| `SITE_URL`   | `https://claude.arcano.site`  |

## Layout

- `app/pages/`: `/`, `/mods`, `/skills`
- `app/components/`: the blueprint pieces (`BpFrame`, `DimLine`, `CopyCommand`, cards, `AgentGuide`)
- `app/assets/scss/main.scss`: tokens, the grid paper and page layout
- `public/_headers`: content types and CORS for the agent files
- `wrangler.jsonc`: the Worker, its assets folder and the custom domain
