---
name: agentic-engineering-workflow
description: Plan and execute a bounded, end-to-end AI-assisted software change from repository discovery through implementation, verification, cleanup, review, and handoff. Use when a user asks for an agentic engineering workflow, wants to turn an underspecified feature into reviewable coding steps, needs to recover an AI-built change from “vibe coding,” or wants to coordinate the companion agentic-engineering source-context, structure-cleanup, review-agent, and review-loop skills. Do not use for a tiny, already-specified edit that can be implemented and tested directly.
---

# Agentic Engineering Workflow

Treat the agent as an implementer inside an evidence-driven engineering loop. Keep product decisions with the user and make every change reviewable.

## Run the workflow

1. **Establish the finish line.** Inspect repository instructions and relevant code. Restate the requested behavior, constraints, acceptance checks, and any decision that genuinely requires the user.
2. **Bound the change.** Select the smallest vertical slice that provides useful behavior. Split unrelated work into later tasks instead of expanding the current diff.
3. **Ground the implementation.** Search existing code before designing abstractions. If a dependency API or framework behavior is uncertain, apply `$agentic-engineering-source-context` when installed; otherwise perform the same version-matched source check directly.
4. **Implement the slice.** Follow repository conventions, reuse existing seams, and avoid speculative infrastructure or unrelated rewrites.
5. **Verify proportionally.** Run the narrowest relevant tests, then broader checks when risk warrants them. Exercise the user-visible path when practical. Report checks that could not run and why.
6. **Clean the changed area.** After behavior works, apply `$agentic-engineering-structure-cleanup` when installed and only if the diff introduced or exposed meaningful duplication, tangled responsibilities, or inconsistent mechanics. Otherwise perform a focused cleanup directly.
7. **Review when requested.** When the user explicitly requests an independent read-only review, apply `$agentic-engineering-review-agent` when installed or use an equivalent read-only review pass.
8. **Resolve review feedback.** When concrete human or automated feedback exists, apply `$agentic-engineering-review-loop` when installed or maintain the bounded review ledger directly. Evaluate comments instead of accepting them blindly.
9. **Hand off the result.** Summarize the outcome, important files changed, verification evidence, residual risks, and decisions still requiring a human.

## Apply guardrails

- Preserve unrelated user changes in a dirty worktree.
- Obtain approval before adding a dependency unless the request clearly authorizes it.
- Check a dependency's locked version, maintenance history, release provenance, and relevant advisories before adopting or upgrading it.
- Never expose secrets in prompts, logs, screenshots, patches, or test fixtures.
- Escalate authentication, authorization, data-loss, payment, and public-interface changes for explicit security review.
- Do not equate a clean diff or passing test suite with product validation.

## Stop or split when

- Acceptance criteria conflict or a missing product decision would materially change the implementation.
- The requested slice spans unrelated subsystems that can be delivered independently.
- Verification repeatedly fails for an environmental reason outside the task's scope.
- A proposed “cleanup” would dominate the feature diff.

## Use this starter prompt

```md
Use an agentic engineering workflow for this task:

<feature, fix, or outcome>

1. Inspect repository instructions and existing implementations first.
2. Define the smallest reviewable slice and its acceptance checks.
3. Verify uncertain dependency behavior against the versioned source.
4. Implement only that slice and preserve unrelated changes.
5. Run relevant tests and exercise the changed path when practical.
6. Clean only meaningful duplication introduced or exposed by the change.
7. Report the outcome, evidence, and remaining human decisions.
```

## Verify completion

- Confirm the delivered behavior matches the stated finish line.
- Confirm the diff is bounded and follows existing repository conventions.
- Confirm uncertain APIs were supported by version-matched evidence.
- Confirm relevant automated and manual checks ran, or document why they did not.
- Confirm the handoff distinguishes completed work, residual risk, and human decisions.
