---
name: memory-adr-okf
description: Set up and maintain a lightweight, git-tracked project knowledge bundle under .memory/ using Open Knowledge Format (OKF) v0.2 conventions, a single mutable STATUS.md, and minimal Markdown Architecture Decision Records (MADR-style) for durable decisions. Use when a user wants project memory/documentation for AI agents or teammates, wants to record or look up why a decision was made, wants documentation kept current with the code, or needs interrupted work to be resumable. For reconstructing knowledge in an existing undocumented repository from code and Git diffs, use memory-retroactively instead.
---

# memory-adr-okf

Maintain a small, human-readable project knowledge bundle that agents can consult before
working and maintain as the repository evolves.

The bundle lives **only at `.memory/`**. It follows OKF v0.2's lightweight model:
Markdown files, YAML frontmatter on knowledge documents, navigable `index.md` files,
and Git for versioning. Architecture decisions use a deliberately small MADR-style body.

This skill is for maintaining explicit project knowledge. Git remains the source of truth
for source history; `.memory/` is the curated current knowledge and durable rationale.

## Core principles

1. **Read before changing.** Before meaningful work, read `.memory/index.md`, then only
   the linked documents relevant to the task.
2. **Keep it small.** Do not document trivial implementation details or mirror the code.
3. **Current knowledge is living.** Architecture/concept/workflow/convention docs may be
   updated when reality changes.
4. **Decisions preserve rationale.** Accepted decision bodies are historical snapshots.
   If a decision changes, create a new ADR and supersede the old one.
5. **Git is history, `.memory/` is knowledge.** Do not create one memory document per
   commit.
6. **Evidence over invention.** Never invent rationale. If evidence is incomplete, say so.

## Structure

Use this structure, creating subdirectories only when they contain useful documents:

```text
.memory/
  index.md
  STATUS.md
  decisions/
    index.md
    0001-<slug>.md
  architecture/        # current system design; optional until needed
    index.md
  concepts/            # domain rules/terms; optional until needed
    index.md
  workflows/           # build/deploy/operational workflows; optional until needed
    index.md
  conventions/         # project-specific conventions; optional until needed
    index.md
```

Do not rename `.memory/` to `memory/`, `knowledge/`, `docs/memory/`, or another location.

## OKF conventions used by this skill

- Root `.memory/index.md` declares `okf_version: "0.2"`.
- Knowledge documents use YAML frontmatter and always include a non-empty `type`.
- Prefer `title` and `description` for useful agent discovery.
- Use OKF lifecycle `status` only with `draft`, `stable`, or `deprecated`.
- For ADR workflow state, use `decision_status` instead of `status` to avoid collision
  with OKF lifecycle semantics.
- Optional `sources`, `generated`, and `verified` metadata may be used when useful, but
  are not required for ordinary maintenance.

## Setup / adoption

1. Check for `.memory/`.
   - If it exists, validate its shape and continue with **Using it going forward**.
   - If it does not exist, inspect the repository before creating anything.
2. Search for existing project knowledge that may need to be preserved or migrated:
   - `docs/`, `documentation/`, `architecture/`, `adr/`, `adrs/`, `decisions/`
   - `README*`, `CONTRIBUTING*`, `DESIGN*`, `ARCHITECTURE*`, `PLAN*`, `STATUS*`
   - `AGENTS.md`, `CLAUDE.md`, and other agent instructions
   - loose design/refactor/planning Markdown files
3. If meaningful existing knowledge is found, **show the user a concise inventory and
   ask whether it should be migrated/linked into `.memory/` before moving or rewriting
   it**. Do not silently delete or relocate maintained documentation.
4. Create `.memory/index.md` from the template.
5. Create `.memory/STATUS.md` from the template and fill it from the repository's real
   current state. Use `git status --short`, recent history, tests/build state when known,
   and visible unfinished work. Never leave placeholder prose.
6. Create `.memory/decisions/index.md` from the template.
7. Migrate only knowledge the user approved. Prefer links to existing authoritative docs
   when duplication would create two sources of truth.
8. Find the repo's agent-context file (`AGENTS.md` or `CLAUDE.md`). Add the short pointer
   from `assets/templates/agents-md-pointer.md`. If neither exists, ask whether to create
   a minimal `AGENTS.md` or skip the pointer.
9. If the repository is mature but has little/no trustworthy documentation and the user
   wants history reconstructed from the implementation, use **memory-retroactively**;
   do not guess historical decisions in this maintenance skill.

## Using it going forward

### Before work

1. Read `.memory/index.md`.
2. Read `.memory/STATUS.md` when current/in-flight state matters.
3. Follow only the relevant links for the task; do not load every knowledge file.
4. If an ADR covers the area, read it before proposing a reversal.

### During/after work

Update `.memory/` in the same change when implementation makes existing knowledge false
or materially incomplete.

Choose the document type by asking what changed:

- **How the system currently works** → `.memory/architecture/`
- **A domain term/rule/invariant** → `.memory/concepts/`
- **How the team/system performs a repeatable task** → `.memory/workflows/`
- **A project-specific standing convention** → `.memory/conventions/`
- **A durable decision with meaningful alternatives/trade-offs** → `.memory/decisions/`
- **Only current/in-flight state** → `.memory/STATUS.md`
- **Trivial/local implementation detail** → do not add project memory

### Decision records

Use `assets/templates/adr-template.md`.

Minimum body:

- Context
- Decision
- Consequences

`Alternatives considered` is optional and should be included only when it prevents a
future reader from re-deriving/reopening rejected choices.

For accepted ADRs:

- Treat Context/Decision/Consequences as immutable historical content.
- Lifecycle metadata may be updated later (`decision_status`, `superseded_by`).
- To replace a decision, create a new ADR with `supersedes`, then update the old ADR's
  metadata to `decision_status: superseded` and `superseded_by: 000N`.
- Keep `.memory/decisions/index.md` accurate.

### STATUS.md

`STATUS.md` is intentionally mutable and describes the present, not a log. Rewrite stale
sections instead of appending history. Do not create parallel files such as
`PROGRESS.md`, `ACTIVE_CONTEXT.md`, `NEXT.md`, or `TECH_CONTEXT.md` for the same purpose.

## Migration rules

- Preserve authorship/history in Git; avoid destructive moves unless the user approves.
- Do not duplicate a maintained external or in-repo document just to satisfy the format.
  `.memory/` may link to it and summarize only what agents need for discovery.
- If content is stale or contradictory, mark the migrated knowledge `status: draft` and
  explain the uncertainty instead of normalizing it silently.
- If a rationale cannot be established, write `Rationale not established from available
  evidence` rather than inventing one.

## Templates

Use templates in `assets/templates/` rather than retyping structures:

- `memory-index.md`
- `STATUS.md`
- `adr-template.md`
- `decisions-index.md`
- `knowledge-document.md`
- `agents-md-pointer.md`
