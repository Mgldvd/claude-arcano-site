# claude.arcano.site

Claude Code mods and agent skills, and the site that publishes them at https://claude.arcano.site.

| Folder    | What it holds                                                                 |
| --------- | ----------------------------------------------------------------------------- |
| `mods/`   | Claude Code plugins built on hooks, with their `claude-mods` marketplace       |
| `skills/` | Agent skills, one folder with a `SKILL.md` each (see `skills/CLAUDE.md`)       |
| `site/`   | The Nuxt site: lists, a code view of every file, archives and the agent guide |

The site is built from these folders and published from a local clone with `task deploy`
(see [Publish](#publish)); nothing publishes on push.

## Install

Give your agent this prompt:

```text
Read https://claude.arcano.site and follow its instructions for AI agents to install the mods and skills.
```

It lists what is available, asks which ones you want, and installs them.

## Work on the mods and skills

The commands are [Task](https://taskfile.dev) tasks; `task` lists them all.

```sh
task check                       # validate and test every mod
task mods:test MOD=<mod>         # one mod's tests (mods:validate likewise)
task mods:install                # copy mods/ into your installed claude-mods, then /reload-plugins
```

Third-party skills kept on disk for the agents are listed in `skills/.gitignore`: they are not
published here or on the site.

## Build the site

```sh
task setup             # the site's dependencies
task dev               # serve it with hot reload
task build             # mods/ and skills/ → archives, catalog, code view, pages in site/.output/public
task preview           # serve the build as Cloudflare will (wrangler dev)
```

## Publish

The site is published from a clone, never from CI:

```sh
git clone git@github.com:Mgldvd/claude-arcano-site.git
cd claude-arcano-site
task deploy
```

`task deploy` asks for confirmation, refuses uncommitted or unpushed changes (the site is always
what GitHub holds), installs the dependencies, validates and tests every mod, builds, and
publishes with `wrangler deploy`. The first time on a machine, sign in to the Cloudflare account
that owns `arcano.site`: `cd site && pnpm exec wrangler login`.
