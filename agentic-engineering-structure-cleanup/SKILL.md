---
name: agentic-engineering-structure-cleanup
description: Refactor a working, AI-assisted feature within an agentic engineering workflow without changing observable behavior by removing meaningful duplication, clarifying responsibilities, and aligning the changed area with repository conventions. Use after a feature or fix works when the diff contains repeated runtime mechanics, API calls, parsing, validation, business rules, or tangled boundaries; also use when a user explicitly requests a focused post-feature cleanup. Do not use for broad redesigns, formatting-only changes, or speculative abstractions.
---

# Agentic Engineering Structure Cleanup

Improve the smallest relevant area only after its behavior is working. Prefer the repository's existing architecture over a generic “service layer.”

## Establish a baseline

1. Read repository instructions, the current diff, and the callers and tests surrounding the changed code.
2. Identify the verification command that currently demonstrates the feature works.
3. Run that check before refactoring when practical. Record any pre-existing failure so it is not attributed to the cleanup.

## Diagnose before editing

List each concrete issue with its locations and cost:

- duplicated external calls, parsing, normalization, validation, or business rules;
- a function or component mixing orchestration, policy, and low-level mechanics;
- inconsistent error handling or data shapes for the same operation;
- a new abstraction that duplicates an established repository seam.

Ignore cosmetic similarity and one-off code that is clearer inline. Do not extract merely to reduce line count.

## Choose the smallest refactor

- Reuse or extend an existing module when it already owns the responsibility.
- Extract stable mechanics when multiple callers must behave consistently.
- Keep business policy close to the use case unless the repository already centralizes it elsewhere.
- Preserve public signatures, side effects, error semantics, ordering, and user-visible output unless the user authorizes a behavior change.
- Keep renames and file moves to the minimum needed for clarity.

Before editing, state the intended extraction and why it is smaller than the alternatives. If no material structural problem exists, report that conclusion and stop without manufacturing a diff.

## Implement and verify

1. Make one coherent structural change at a time.
2. Update focused tests only when boundaries or test seams change; do not weaken assertions to make the refactor pass.
3. Run formatting, static checks, and focused tests relevant to the touched area.
4. Re-run the baseline check and inspect the final diff for accidental behavior changes.

## Use this cleanup prompt

```md
The feature works. Perform a focused code-structure cleanup.

Inspect the diff, nearby callers, existing abstractions, and tests. Identify concrete duplication or tangled responsibilities with file-level evidence. Propose and implement the smallest refactor that follows this repository's conventions and preserves observable behavior. Do not redesign unrelated code or create an abstraction without a clear current consumer. Run the relevant checks and summarize what became simpler.
```

## Verify completion

- Confirm the baseline behavior still passes the same checks.
- Confirm the refactor removes a named structural cost rather than moving it.
- Confirm callers are simpler or more consistent.
- Confirm no unrelated formatting, renaming, or architecture churn entered the diff.
- Report any behavior that could not be verified.
