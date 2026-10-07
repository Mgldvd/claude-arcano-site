---
name: agentic-engineering-review-loop
description: Triage and resolve concrete code-review feedback within an agentic engineering workflow in a bounded review-fix-verify loop until actionable findings are addressed or a human decision is required. Use for a small pull request, branch, or feature with pasted, local, human, AI-reviewer, or Greptile-style findings and an objective test or typecheck signal. Do not use for initial implementation, very large diffs, vague product criticism, or unattended commit/push operations without explicit authorization.
---

# Agentic Engineering Review Loop

Resolve evidence-backed findings without turning review into an open-ended rewrite. Treat every reviewer comment as a hypothesis to verify.

## Check readiness

1. Read repository instructions, working-tree status, and the complete target diff.
2. Identify the intended behavior and the commands that define a passing result.
3. Collect all review findings with their source, file or symbol, and stated concern.
4. Stop and propose a split if the diff contains unrelated changes or is too large to reason about reliably.

## Maintain a review ledger

Track each finding as one of:

- `accepted` — reproduced or supported by code evidence;
- `rejected` — incorrect, obsolete, outside the diff, or contrary to requirements;
- `needs-decision` — depends on product, compatibility, security, or scope judgment;
- `resolved` — fixed and verified.

Record a short rationale and verification evidence. This prevents duplicate comments from restarting the loop.

## Run one iteration

1. Reproduce or inspect each new finding before editing.
2. Prioritize correctness, security, data loss, and regressions before maintainability suggestions.
3. Fix only accepted findings with the smallest coherent patch.
4. Add or strengthen a regression test when the finding describes observable behavior and a suitable test seam exists.
5. Run focused checks first, followed by the required broader suite.
6. Re-read the diff and update the ledger.
7. Obtain fresh review feedback only through tools and external actions the user has authorized.

Repeat only for genuinely new or unresolved evidence.

## Stop the loop when

- all accepted findings are resolved and required checks pass;
- the remaining item needs a human product or risk decision;
- the same finding returns without new evidence after a verified fix;
- reviewer instructions conflict;
- resolving a finding requires unrelated redesign or materially expands the scope;
- an environmental blocker prevents meaningful verification.

Do not commit, push, dismiss comments, or change pull-request state unless the user explicitly authorized that action.

## Use this review prompt

```md
Run a bounded review-fix loop for this diff.

Review input: <feedback text or authorized source>
Required checks: <commands or acceptance criteria>

Read the full diff first. Build a ledger of findings, verify each against the code, fix only accepted items, add regression coverage where useful, and run the required checks. Stop when actionable findings are resolved or a human decision is needed. Do not commit, push, or modify PR state unless explicitly authorized.
```

## Report the result

- List resolved findings and their verification evidence.
- List rejected findings with concise code-based reasoning.
- List remaining decisions or environmental blockers.
- State the final test, typecheck, lint, or manual-check results.
