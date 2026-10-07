# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A flat collection of standalone **Codex/Claude Code skills** — each top-level folder is a
self-contained `SKILL.md` package (the same format that populates this very session's
available-skills list). There is no application code, no build, and no test suite in the
traditional sense: the unit of work is a single skill folder, and "correctness" means the
folder conforms to the skill packaging convention and its instructions actually work when
invoked.

`README.md` is the maintained index of the collection (per-skill tag + recommended install
group, plus a section flagging skills that duplicate or complement each other). It currently
lags behind recent restructuring — e.g. it still lists `git-commit-no-ai` and `memory-adr`,
which are now `commit-convention` (formerly `commit-no-ai`) and `memory-adr-okf`, and it
doesn't yet mention `memory-retroactively` or `commit-history-rewrite`. Treat the actual
top-level directory
listing as ground truth for what exists, and update `README.md`'s table/groups whenever you
add, rename, split, or merge a skill — that upkeep is part of the change, not a follow-up.

## Skill anatomy (the convention every folder follows)

```
skill-name/
├── SKILL.md              required: YAML frontmatter (name, description) + Markdown body
├── agents/openai.yaml    UI metadata: display_name, short_description, default_prompt
├── scripts/              executable helpers for fragile/repeated deterministic operations
├── reference*/           docs loaded into context only on demand, not up front
├── assets/ or templates/ files copied into a skill's output, not read for guidance
└── .signature            auto-generated per-skill provenance stamp — never hand-author one
```

- The folder name and the frontmatter `name` must match exactly.
- `description` carries **all** "when to use this" triggering information — the body is only
  loaded after the skill triggers, so putting triggers there is invisible to the router.
- Keep `SKILL.md`'s body under ~500 lines; once a skill grows past that, split variant-specific
  detail into `reference/*.md` files linked one level deep from `SKILL.md`, not nested further.
- `agents/openai.yaml` is present on every skill except `cli-go-cobra`, `linux-mint-engineer`,
  and `playwright-cli`. When you edit a skill's `SKILL.md`, check whether its `openai.yaml`
  (display text, `default_prompt`) is now stale and regenerate it — don't let the two drift.

## Commands

There is no repo-wide build/lint/test. Skill authoring and validation go through the
`agent-extension-skill-creator` meta-skill's scripts:

```bash
# one-time, for the validator's dependencies
python -m pip install -r agent-extension-skill-creator/scripts/requirements.txt

# scaffold a new skill
python3 agent-extension-skill-creator/scripts/init_skill.py <skill-name> \
  --path <output-directory> [--resources scripts,references,assets] [--examples]

# validate a single skill folder (frontmatter/naming, root structure, agent metadata,
# stray generated artifacts, missing TOCs on long reference files, local Markdown links)
python3 agent-extension-skill-creator/scripts/quick_validate.py <path/to/skill-folder>

# regenerate agents/openai.yaml after editing a skill
python3 agent-extension-skill-creator/scripts/generate_openai_yaml.py <path/to/skill-folder> \
  --interface key=value [--interface key2=value2 ...]

# audit naming/family consistency across the whole repo
python3 agent-extension-skill-family-organizer/scripts/audit_skill_families.py .
```

Run `quick_validate.py` on every skill folder you create or materially edit before considering
the change done — it's the closest thing this repo has to a test suite. There is no way to
"run" a skill outside of actually invoking it in an agent session (forward-testing), so a
non-trivial behavioral change should be exercised that way rather than assumed correct from
reading it back.

## Architecture: families, not directories

Skills are namespaced with a flat, hyphen-prefix convention instead of nested folders — related
specialists are sibling top-level directories sharing a prefix: `frontend-*`,
`agentic-engineering-*`, `agent-extension-*`, `cli-go-cobra*`, `tampermonkey*`, `memory-*`,
`commit-*`. A shared prefix signals a family relationship (see `README.md`'s "Recommended
install groups" for which families are meant to be installed together vs. as alternatives), but
each member must still work standalone if its companions aren't installed — cross-skill
delegation is by convention/name in prose ("use `commit-convention` for future commits"), never
by one skill reading another skill's files at runtime.

That last point drives a real constraint: **skill folders cannot share a reference file**, since
each one is installed as an independent unit. When two skills need the same standard (e.g.
`commit-convention` and `commit-history-rewrite` both need the exact same commit-message grammar and
its "no AI attribution" rule), the fix is a byte-identical copy in each folder, not a pointer —
and keeping those copies in sync is a manual, load-bearing responsibility. Before editing a
reference file that looks like it might be duplicated, `grep -rl` for a distinctive line from it
across the repo and update every copy, not just the one you found first.

## Meta-tooling (the `agent-extension-*` family)

These four skills are the toolchain for maintaining this repository itself:

- `agent-extension-skill-creator` — create/update/validate a skill (scripts above); read its
  `SKILL.md` before writing a new `SKILL.md` by hand, it encodes the packaging rules in full.
- `agent-extension-skill-family-organizer` — group, rename, or split skills under a shared
  prefix while keeping folder names, frontmatter, `openai.yaml`, and cross-references in sync.
- `agent-extension-plugin-creator` — package a skill or set of skills as an installable Codex
  plugin (`.codex-plugin/plugin.json`); not currently used for anything in this repo.
- `agent-extension-skill-installer` — pulls *external* skills from OpenAI's curated/experimental
  repo into `$CODEX_HOME/skills`; unrelated to publishing skills that live in this repo.
