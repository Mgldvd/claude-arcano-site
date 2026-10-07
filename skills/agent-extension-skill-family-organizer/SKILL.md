---
name: agent-extension-skill-family-organizer
description: Organize related Codex skills into consistent, flat, prefix-based families and keep their folders, frontmatter, UI metadata, companion references, and repository references synchronized. Use when creating a family of related skills, grouping or namespacing existing skills, renaming several skills under a logical prefix, splitting an oversized skill into coordinated specialists, or auditing a project skill directory for inconsistent organization.
---

# Skill Family Organizer

Organize skills as discoverable specialists in a flat skill directory. Use a shared logical prefix
to express a family, then make each member independently usable and explicit about its optional
companions.

## Contract

- **Input:** A skill root and a requested grouping, rename, split, or organization audit.
- **Output:** A verified family map and, when changes are requested, synchronized skill folders, metadata, and repository references.
- **Side effects:** Read the selected repository; modify only in-scope skills and their direct references. Renames and dependency changes require the authority implied by the user's request.
- **Failures:** Stop on name collisions, ambiguous ownership, overlapping user edits, invalid metadata, or incomplete reference updates. Report partial migrations as incomplete.
- **Non-goals:** Do not reorganize system, vendor-owned, or unrelated skills merely for visual uniformity.

## Resolve Rules in Order

1. Follow the user's requested names, scope, and grouping.
2. Follow repository instructions and the current skill-root convention.
3. Preserve installed or vendored packages unless the task explicitly includes them.
4. Apply the flat, prefix-based family pattern in this skill as the fallback.

Do not interpret “group” as permission to rewrite unrelated skill content. Preserve existing
behavior while changing identity, routing, and cross-references.

## Inspect the Skill Root

1. Locate the project skill root from repository instructions or existing `SKILL.md` files.
   Prefer the established directory; otherwise use the explicitly supplied skill root.
2. Read every in-scope skill's frontmatter, `agents/openai.yaml`, directly linked references, and
   repository references to its current name or path.
3. Exclude hidden system directories such as `.system` unless the user explicitly includes them.
4. Run `python3 scripts/audit_skill_families.py <skill-root>` to inventory families and detect
   identity mismatches.
5. Check Git status before renaming. Preserve unrelated user changes and stop if an in-scope file
   has overlapping edits that cannot be retained safely.

Read [references/project-pattern.md](references/project-pattern.md) before choosing a prefix or
restructuring more than one skill.

## Design the Family

Choose a short, stable prefix that communicates a real shared boundary:

- use a domain or platform prefix for related specialists, such as `frontend-*` or
  `cloudflare-*`;
- use a workflow prefix for related operations, such as `git-*` or `docs-*`;
- keep the namespace flat: create sibling folders named `<family>-<specialist>`, not a nested
  `<family>/<specialist>` hierarchy;
- require each folder name and its frontmatter `name` to match exactly;
- keep names lowercase, hyphenated, and under 64 characters;
- avoid a one-member “family” unless the prefix materially improves triggering or leaves room for
  a known near-term companion;
- do not group skills merely because they use the same language or tool if their triggers and
  responsibilities do not overlap.

Define boundaries before editing. Each family member must own a distinct trigger surface and must
remain useful when its companions are unavailable. Resolve overlap by assigning one member as the
authority for each concern.

Create an umbrella skill only when users need one entry point that selects or sequences at least
two specialists. A shared prefix alone is sufficient for most families.

## Plan the Migration

Prepare an explicit map before renaming:

```text
old-folder -> family-specialist
old frontmatter name -> family-specialist
old $invocation -> $family-specialist
```

Search the entire repository for every old folder name, skill name, `$skill` invocation, default
prompt, companion mention, script path, documentation link, and configuration entry. Check for
case-insensitive collisions and names that already exist.

When splitting one skill:

1. assign every original responsibility to exactly one new member;
2. keep shared invariants concise in each member or place detailed shared knowledge in one directly
   linked reference;
3. remove duplicated or contradictory instructions;
4. preserve an umbrella only when it performs real routing or orchestration.

## Apply the Migration

1. Initialize genuinely new skills with the installed `agent-extension-skill-creator` workflow.
2. Rename existing directories with a history-preserving move.
3. Update each `SKILL.md` frontmatter `name` and triggering `description`.
4. Update headings only when the displayed identity changed.
5. Update companion references to the new exact names. Describe companions as optional unless the
   skill cannot function without them.
6. Update `agents/openai.yaml` so its display text reflects the specialist and its
   `default_prompt` explicitly invokes `$<folder-name>`.
7. Update directly linked references, scripts, repository instructions, prompts, and config files.
8. Keep detailed family rationale in references, not repeated across every member.

Never rename system or third-party skills solely to make the directory visually uniform. Never
leave compatibility copies with duplicate trigger descriptions; use a deliberate migration note
or repository-supported alias only when backward compatibility is required.

## Coordinate Family Members

In each member, name only companions that materially affect its work. State which concern each
companion owns. Use wording such as:

```markdown
Apply `family-accessibility` for semantic and keyboard behavior when it is installed. Complete the
current task from this skill and repository conventions when that companion is unavailable.
```

Avoid circular delegation. One skill may ask another to refine a concern, but it must not refuse
its core task merely because a companion is absent.

## Verify

Run:

```bash
python3 scripts/audit_skill_families.py <skill-root> --strict
python3 <agent-extension-skill-creator>/scripts/quick_validate.py <skill-root>/<changed-skill>
```

Validate every changed skill, then:

1. search for stale old names and paths;
2. inspect the final family inventory and singleton list;
3. confirm folder name, frontmatter name, and `$name` in `agents/openai.yaml` agree;
4. inspect Git diff for unintended content movement or unrelated edits;
5. exercise at least one realistic trigger for each distinct specialist when the restructuring is
   substantial.

Report the final family map, deliberate singletons, compatibility decisions, validation commands,
and anything that could not be verified.
