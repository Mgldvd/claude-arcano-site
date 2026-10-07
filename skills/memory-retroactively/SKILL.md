---
name: memory-retroactively
description: Reconstruct a lightweight .memory/ project knowledge bundle for an existing repository by analyzing the current codebase and historical Git diffs, then expressing the result with OKF v0.2 conventions and minimal MADR-style decisions. Use when a mature/legacy repo lacks trustworthy documentation or project memory and the user wants AI-readable documentation derived from implementation history. Commit messages are not primary evidence; use code, diffs, tests, configuration, and existing docs first.
---

# memory-retroactively

Build `.memory/` for an existing repository from evidence already present in the repo.
The goal is not to summarize every commit. The goal is to reconstruct **current project
knowledge** and a small set of **durable historical decisions** that help a maintainer or
agent understand how the system got here.

Output follows the same lightweight conventions as `memory-adr-okf`:

- `.memory/` fixed root
- OKF v0.2-style Markdown + YAML frontmatter
- `.memory/index.md` for progressive disclosure
- `.memory/STATUS.md` for current mutable state
- minimal MADR-style files under `.memory/decisions/`

After bootstrap, use `memory-adr-okf` for ongoing maintenance. Commit messages may also be normalized to a shared Conventional Commits + `.memory/` trailer standard via the separate `commit-history-rewrite` skill, but history rewriting is always optional, lives outside this skill, and requires explicit approval.

## Evidence policy

### Primary evidence

Use, in roughly this order:

1. Current source code and module boundaries
2. Historical Git diffs / patches
3. Tests and test evolution
4. Configuration, schemas, migrations, infrastructure-as-code
5. Build/deploy/CI definitions
6. Existing maintained documentation and ADRs
7. File renames/moves and dependency changes visible in diffs

### Secondary evidence

Use only to corroborate, not to invent rationale:

- PR/issue text when locally available
- Release notes/changelogs
- Commit messages

**Do not infer a decision rationale solely from a commit message.** The user explicitly
wants reconstruction from code and diffs. Commit messages may help locate history but
must not be treated as authoritative reasoning unless independently corroborated.

## Confidence rule

Separate three things:

- **Observed:** directly supported by current code or historical diffs.
- **Inferred:** plausible interpretation of observed evolution, but rationale is not
  explicitly evidenced.
- **Verified:** confirmed by existing authoritative docs or by the maintainer.

Never rewrite an inference as fact. If the reason for a change cannot be established,
state that plainly.

## Workflow

### 1. Preflight

- Confirm this is a Git repository and inspect repository size/history shape.
- Check whether `.memory/` already exists.
  - If it exists and contains meaningful knowledge, do not overwrite it. Switch to
    maintenance or propose a targeted backfill.
- Detect monorepo boundaries/workspaces if applicable.

Useful commands include:

```bash
git status --short
git rev-parse --show-toplevel
git log --all --format='%H' --name-only
git diff <old> <new> -- <path>
git show <sha> --format= -- <path>
git log --follow --format='%H' -- <path>
```

Use `--format=`/equivalent when inspecting patches so commit messages are excluded from
primary analysis.

### 2. Inventory existing knowledge first

Search for existing documentation/memory before reconstructing it:

- `.memory/`, `memory/`, `knowledge/`
- `docs/`, `documentation/`, `architecture/`
- `adr/`, `adrs/`, `decisions/`
- `README*`, `CONTRIBUTING*`, `ARCHITECTURE*`, `DESIGN*`, `PLAN*`, `STATUS*`
- `AGENTS.md`, `CLAUDE.md`
- runbooks, migrations, schemas, CI/CD docs, wiki exports

If meaningful maintained knowledge is found, **show the user a concise inventory and ask
whether to migrate, link, or leave each source in place before changing it**. Do not
silently replace authoritative documentation.

### 3. Build a current-system map before reading deep history

Understand what exists now:

- top-level components/modules/services
- public APIs and major boundaries
- persistence and data ownership
- authentication/authorization
- queues/events/background processing
- external integrations
- build/test/deploy path
- important domain concepts/invariants

Use this map to choose which historical paths deserve deeper diff analysis. Avoid a
blind commit-by-commit full-history summary.

### 4. Cluster history by subsystem

Group historical changes around meaningful areas such as:

```text
authentication
payments
persistence
API
messaging
infrastructure
build/deploy
```

For each cluster:

- identify substantial transitions using changed paths and diff size/patterns;
- follow renames/moves where practical;
- compare before/after implementations;
- inspect tests/config/migrations changed alongside the code;
- discard formatting-only, generated, vendored, lockfile-only, and trivial churn.

### 5. Extract knowledge, not commits

Generate documents only when the evidence supports durable project knowledge.

Route findings as follows:

- **Current structure/behavior** → `.memory/architecture/`
- **Domain rules/invariants/terminology** → `.memory/concepts/`
- **Repeatable build/deploy/operational behavior** → `.memory/workflows/`
- **Standing project-specific conventions** → `.memory/conventions/`
- **Significant historical choice with observable alternatives/trade-offs** →
  `.memory/decisions/`
- **Current working state** → `.memory/STATUS.md`

Do **not** create one document per commit or one ADR per refactor.

### 6. Decision extraction threshold

Create a retroactive ADR only if most of these are true:

- the change is architecturally/domain significant;
- before/after states are visible in code/diffs;
- the choice would be expensive to re-derive or easy to accidentally reverse;
- consequences/trade-offs are observable;
- there is enough evidence to describe the decision without fabricating motives.

If the change is significant but the rationale is unknown, an ADR may still record the
**observed decision** while explicitly saying the rationale could not be established.

### 7. Record provenance lightly

For reconstructed documents, use OKF metadata to make origin/trust visible without
turning every file into a schema exercise.

Recommended generated-document frontmatter:

```yaml
---
type: Architecture
title: Authentication architecture
description: Current authentication model reconstructed from repository evidence.
status: draft
sources:
  - id: current-auth
    resource: repo:src/auth/
    title: Current authentication implementation
  - id: auth-history
    resource: git:path:src/auth/
    title: Historical diffs affecting authentication
generated:
  by: agent/memory-retroactively
  at: <ISO-8601 timestamp>
---
```

Keep `status: draft` for reconstructed/inferred knowledge until the maintainer verifies
it. After confirmation, use `status: stable` and optional `verified` metadata.

### 8. Create `.memory/`

Create only directories that have useful content:

```text
.memory/
  index.md
  STATUS.md
  architecture/
    index.md
    ...
  decisions/
    index.md
    ...
  concepts/
    index.md
    ...
  workflows/
    index.md
    ...
  conventions/
    index.md
    ...
```

Use templates from `assets/templates/`.

### 9. Present a verification summary

At the end, tell the user:

- what was observed directly;
- what was inferred and remains `draft`;
- which historical areas were analyzed;
- which significant areas were intentionally skipped or lacked enough evidence;
- which existing docs were linked/migrated/left in place;
- which documents most need maintainer verification.

Do not claim the reconstructed memory is complete merely because the scan completed.

### 10. Optional full commit-history normalization

Commit-history normalization is not part of this skill. If the user separately wants every
reachable commit message in the repository rewritten to Conventional Commits (optionally with
`Memory-Ref:`/`Decision-Ref:` trailers pointing into the `.memory/` bundle just built), point
them at the dedicated `commit-history-rewrite` skill — it owns the preview/backup/rewrite
mechanism and safety checks, so this skill doesn't duplicate them. Never trigger it
automatically; it is always a separate, explicit request.

### 11. Wire ongoing maintenance

Add the short `.memory/` pointer to `AGENTS.md`/`CLAUDE.md` if approved, and recommend using
`memory-adr-okf` for future knowledge maintenance, `commit-convention` for future commits, and
`commit-history-rewrite` for any later full-history normalization, so the reconstructed bundle
and commit history keep using the same traceability standard instead of drifting apart.

## Scaling rules for large repositories

- Start with current architecture, then selectively traverse history.
- Prefer subsystem/path history over entire-repo patch dumps.
- Sample/cluster first, inspect detailed patches second.
- Exclude generated/vendor/build outputs and lockfile-only churn unless dependency
  evolution itself is architecturally relevant.
- Do not assume the oldest commit is the architectural beginning; imported histories and
  squashed migrations may hide earlier context.
- For monorepos, build per-workspace/component maps and cross-link shared decisions.

## Templates

- `memory-index.md`
- `STATUS.md`
- `adr-template.md`
- `knowledge-document.md`
- `decisions-index.md`
- `directory-index.md`
- `agents-md-pointer.md`
