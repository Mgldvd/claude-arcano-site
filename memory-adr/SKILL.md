---
name: memory-adr
description: Set up and maintain a lightweight, git-tracked project memory made of numbered Architecture Decision Records (ADRs) for point-in-time decisions plus a single mutable STATUS.md for active/in-flight work, wired into the repo's AGENTS.md or CLAUDE.md. Use when a user wants an AI agent (or a new teammate) to understand a codebase after being away for a while, asks to set up project memory, record or look up why a decision was made, add an ADR, or wants interrupted work to be resumable across sessions. Not for a one-off script or a throwaway prototype nobody will return to.
---

# Memory ADR

Give a codebase a memory that survives across sessions without a database: decisions
that don't change once made, and one file that always reflects the present. Any agent
(or human) opening the repo cold reads two things and is caught up.

This is not a replacement for `AGENTS.md`/`CLAUDE.md`. Those hold standing rules
("how we build, test, name things"). This holds history ("why we chose X over Y") and
present state ("what's in flight right now"). Point the standing-rules file at this one;
don't merge them.

## When to set this up

- A user asks to add "memory" for AI agents, set up ADRs, or track decisions.
- A repo has an ad hoc planning/refactor doc floating at the root (`REFACTOR_X.md`,
  `PLAN.md`, a scratch design doc) — that content belongs in a proper ADR, not a loose
  file nobody prunes.
- An existing rule in `AGENTS.md`/`CLAUDE.md` states a constraint without explaining why
  (e.g. "don't add library X") — the rationale belongs in an ADR the rule can point to.
- Work is about to be interrupted (end of session, context running low) and there's
  uncommitted or partially-done work worth recording so it can be resumed cold.

Skip this for a one-off script, a throwaway prototype, or anything nobody will come
back to — the overhead isn't worth it. This is for a project someone will return to
after a real gap, not every repo.

## Structure

```
memory/
  STATUS.md              # the ONLY mutable file — current state, nothing else
  decisions/
    index.md              # table of every ADR + its status
    0001-<slug>.md         # one immutable file per decision
    0002-<slug>.md
```

Templates for all three file types are in `assets/templates/` — copy and fill them, don't
retype the structure from scratch.

## Setup

1. Check whether `memory/` already exists. If it does, this is a maintenance task, not a
   setup — skip to "Using it going forward" below.
2. Find the project's agent-context file (`AGENTS.md` or `CLAUDE.md`). If neither exists,
   ask the user whether to create a minimal one or skip the pointer — don't invent a
   full onboarding doc as a side effect of this skill.
3. Create `memory/decisions/index.md` from `assets/templates/decisions-index.md`.
4. Create `memory/STATUS.md` from `assets/templates/STATUS.md`. Fill it with the
   project's **real** current state — run `git status --short`, `git log -5 --oneline`,
   check for stale branches or obvious unfinished work. Never leave the template's
   placeholder prose in place.
5. Identify 1-3 already-made, non-obvious decisions worth backfilling as retroactive
   ADRs: loose planning docs about to be deleted, unexplained rules in the context file,
   or architecturally significant choices a `git log`/commit-message search surfaces.
   For each one, copy `assets/templates/adr-template.md` to
   `memory/decisions/000N-<slug>.md` and fill Context/Decision/Consequences from real
   evidence (the doc being replaced, the actual commits, the actual code) — never
   invent rationale that isn't evidenced somewhere.
6. Add a short section to the agent-context file pointing at `memory/STATUS.md` and
   `memory/decisions/` (see the pointer text in `assets/templates/agents-md-pointer.md`)
   — a few lines, not a copy of this skill's instructions.
7. Delete any ad hoc planning doc whose content is now captured in an ADR.

## Using it going forward

- **ADRs are immutable once `Accepted`.** Never edit one after the fact. To change a
  decision, write a new numbered ADR that explains the new choice, set the old one's
  status line to `Superseded by 000N`, and update `index.md`.
- **`STATUS.md` is the only mutable file.** Do not add `PROGRESS.md`, `ACTIVE_CONTEXT.md`,
  `TECH_CONTEXT.md`, or similar — splitting mutable state across several files is the
  fastest way for all of them to quietly go stale. One honest, current file beats three
  half-updated ones.
- **Write a new ADR only when the decision is:** architecturally significant, not
  obvious from reading the code, and would cost real time to re-derive or accidentally
  reverse if forgotten. Routine refactors, dependency bumps, or renames with obvious
  rationale don't need one.
- **Update `STATUS.md`** whenever a session ends with uncommitted or partially-done
  work, or whenever its "in progress" section would otherwise mislead the next reader.
  Overwrite stale sections rather than appending to them — it describes the present,
  not a log.
- **Before touching something a decision covers**, read the relevant ADR first. Don't
  reopen an accepted decision without the user's explicit confirmation.
