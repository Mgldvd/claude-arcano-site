# claude.arcano.site

Claude Code mods and agent skills, and the site that publishes them at https://claude.arcano.site.

| Folder    | What it holds                                                                 |
| --------- | ----------------------------------------------------------------------------- |
| `mods/`   | Claude Code plugins built on hooks, with their `claude-mods` marketplace       |
| `skills/` | Agent skills, one folder with a `SKILL.md` each (see `skills/CLAUDE.md`)       |
| `site/`   | The Nuxt site: lists, a code view of every file, archives and the agent guide |

A push to `main` rebuilds the site from these folders and publishes it, so a changed mod or skill
shows on the site (and in its downloads) a minute later.

## Install

Give your agent this prompt:

```text
Read https://claude.arcano.site and follow its instructions for AI agents to install the mods and skills.
```

It lists what is available, asks which ones you want, and installs them.

## Work on the mods and skills

```sh
claude plugin test mods/<mod>          # a mod's tests
claude plugin validate mods/<mod>      # what the engine would refuse
```

Third-party skills kept on disk for the agents are listed in `skills/.gitignore`: they are not
published here or on the site.

## Build the site

```sh
cd site
pnpm install
pnpm run generate      # mods/ and skills/ → archives, catalog, code view, pages in .output/public
pnpm run preview       # serve the build as Cloudflare will (wrangler dev)
pnpm run deploy        # build and publish from your machine
```

## Publish on push

`.github/workflows/deploy.yml` builds on every push and pull request, and publishes pushes to
`main` with `wrangler deploy`. It needs two repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account that owns `arcano.site`
- `CLOUDFLARE_API_TOKEN`: a token made from the **Edit Cloudflare Workers** template

Without the token the workflow still builds, and says it published nothing.
