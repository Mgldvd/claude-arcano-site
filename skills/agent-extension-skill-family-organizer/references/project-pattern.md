# Project Skill Family Pattern

## Purpose

Use this reference when choosing a family prefix, renaming multiple skills, or deciding whether an
umbrella skill is warranted.

## Recommended Pattern

Keep discoverable project skills as direct children of the repository's established skill root.
Related skills share a prefix instead of being placed in nested directories.

Do not vendor a `.system` directory into a project skill root. Keep the user-level Codex skill
directory independent from repository-owned skills so managed built-in skills do not appear in
the project tree.

Examples:

- `frontend-bem-css`, `frontend-style-guide`, `frontend-vue-style-guide`, and the other
  `frontend-*` specialists share a frontend boundary while retaining distinct trigger surfaces.
- `cloudflare-agents-sdk`, `cloudflare-durable-objects`, `cloudflare-wrangler`, and the other
  `cloudflare-*` specialists share a platform boundary.
- `agentic-engineering-workflow`, `agentic-engineering-source-context`,
  `agentic-engineering-structure-cleanup`, `agentic-engineering-review-agent`, and
  `agentic-engineering-review-loop` form an end-to-end engineering family with one coordinator
  and independently usable specialists.
- `agent-extension-pi-creator`, `agent-extension-plugin-creator`,
  `agent-extension-skill-creator`, `agent-extension-skill-installer`, and
  `agent-extension-skill-family-organizer` group creation and maintenance workflows for coding
  agent extensions while preserving distinct product and task boundaries.
- `docs-readme-instructions` and `git-commit` use functional prefixes that clarify their workflow
  without requiring a larger family.

Treat these as examples of the naming model, not as a closed prefix catalog.

## Invariants

- Keep the skill directory flat.
- Match folder name and frontmatter `name` exactly.
- Use lowercase hyphen-case names.
- Give every specialist a distinct description and responsibility.
- Let each specialist complete its core work without installed companions.
- Reference companions by exact skill name and assign each companion a clear concern.
- Keep `agents/openai.yaml` aligned with the final skill name.
- Preserve system and vendor-owned packages unless they are explicitly in scope.
- Search and update repository-wide references whenever a skill identity changes.

## Prefix Selection

Prefer a prefix that answers “which coherent domain, platform, or workflow owns this skill?” A good
prefix remains meaningful as the family grows and does not repeat generic words such as `skill`,
`helper`, or `tool`.

Reject a proposed family when:

- the members share only implementation technology;
- one member completely subsumes another;
- their triggering descriptions would compete for the same requests;
- the prefix is so broad that it provides no routing value;
- nesting would be required to make the names understandable.

## Umbrella Decision

Use only prefixed specialists when users can invoke or implicitly trigger the correct member
directly.

Add an umbrella when it contributes concrete routing or orchestration, for example:

- selecting among several specialists from an ambiguous request;
- sequencing multiple specialists for a cross-cutting workflow;
- applying shared conflict-resolution rules that cannot live cleanly in one specialist.

Do not create an umbrella that merely lists family members. The prefix and skill metadata already
provide that catalog.

## Migration Checklist

- Record old-to-new folder and invocation mappings.
- Check destination collisions.
- Preserve history when moving existing folders.
- Update frontmatter names and descriptions.
- Update UI metadata and default prompts.
- Update companion names and path references.
- Search for stale old identities.
- Audit the skill root.
- Validate every changed skill.
- Inspect the final diff.
