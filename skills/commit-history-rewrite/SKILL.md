---
name: commit-history-rewrite
description: Rewrite commit messages across an entire repository's reachable history to Conventional Commits 1.0.0, with optional .memory/ Memory-Ref/Decision-Ref trailers, while enforcing backups, a mandatory preview, and a zero-AI-attribution guarantee. Use when a repo's commit history is inconsistent or undocumented and the user explicitly wants every reachable commit message normalized — not for single-commit messages (use commit-convention) or removing existing AI-attribution contamination only (also commit-convention).
---

# commit-history-rewrite

Rewrite commit **messages only**, across all selected reachable refs, to a single consistent
standard. This is a destructive, opt-in operation on shared history — never run it without
explicit user authorization, and never chain it automatically after another skill.

Use this skill when the user wants to normalize an entire repository's commit history (for
example, after `memory-retroactively` reconstructs `.memory/` and the user separately asks to
also clean up commit messages, or standalone on any legacy repo). For day-to-day commits on
staged changes, use `commit-convention` instead. For stripping AI-attribution contamination out of
existing history without otherwise touching messages, `commit-convention`'s
`reference/clean-history.md` is the narrower, less invasive tool — prefer it when attribution
removal is the only goal.

## Default is no-op

Keeping history unchanged is always safe and always the default. Only proceed past this point
when the user has explicitly asked to normalize commit history, not merely to generate or fix
one commit message.

Offer these choices when the decision hasn't already been made by the user:

1. **Keep history unchanged** — default and safest.
2. **Prepare a rewrite plan only** — generate a preview mapping of every reachable commit to a
   proposed standardized message, but do not mutate Git history.
3. **Rewrite all commits locally** — rewrite commit messages for all selected reachable refs
   using the shared standard in `reference/commit-standard.md`.

A push is a separate authorization from option 3. Choosing option 3 authorizes only a
**local** history rewrite. Never force-push rewritten history unless the user explicitly
requests the remote rewrite after seeing the local result.

## Standard used for rewritten commits

Use the structured Conventional Commits variant in `reference/commit-standard.md`
([`commit-convention`](https://github.com/Mgldvd/commit-convention)) for every rewritten
message — full grammar, dot-padded column alignment, the type→shape marker table, the scope
vocabulary in `reference/scopes.md`, and the non-negotiable "No AI/agent attribution, ever"
rule. When a repository has a `.memory/` bundle and a document can be reliably linked to a
historical change, optionally add:

```text
Memory-Ref: .memory/architecture/<document>.md
Decision-Ref: .memory/decisions/<decision>.md
```

Do not add a memory trailer when the relationship is only speculative, and never fabricate a
historical rationale just to make a better commit message.

For each historical commit, derive the proposed message primarily from:

1. the commit's tree diff against its parent(s);
2. changed tests/configuration/migrations;
3. `.memory/` knowledge when it exists and a reliable relationship can be established.

Commit messages from the old history remain secondary evidence and must not be copied blindly
into the new message.

## Rewrite-plan requirements

Before any mutation, build a complete preview containing at least:

```text
old SHA | proposed subject | type/scope | memory/decision refs | confidence
```

For merge commits, preserve the merge topology. Prefer a conservative
`chore..............: ○ - merge ...` message (no scope — "merge" is a git mechanism, not an
architectural area, so it does not belong in `reference/scopes.md`) only when the integration
purpose is observable; otherwise keep a neutral merge subject rather than inventing intent.

Flag commits whose diff does not support a confident semantic message. Do not silently invent
one. The user may accept a conservative `chore:` message for such commits or keep the original
message for those specific entries.

## Mandatory safety checks before option 3

History rewriting changes commit IDs. Before rewriting:

- require a clean working tree and index;
- record the current branch, all local branches/tags, and remotes;
- create a backup namespace/ref or an external bundle before mutation;
- warn that rewritten commit SHAs invalidate existing links and may invalidate/remove
  cryptographic commit/tag signatures;
- warn that collaborators with clones/branches based on the old history must coordinate;
- do not rewrite third-party/vendor histories or unrelated remotes accidentally;
- preserve author/committer identity and original timestamps unless the user explicitly
  requests otherwise;
- preserve file trees and parent topology; this operation is a **message rewrite**, not a code
  rewrite;
- never let a rewritten message contain AI/agent attribution (`Co-Authored-By`, "Generated
  with", session links, bracket tags) — see the "No AI/agent attribution, ever" rule in
  `reference/commit-standard.md` and verify its absence before any push, same as `commit-convention`.

Prefer `git filter-repo` when available because it is designed for repository rewriting. If it
is not available, explain the fallback before using another mechanism. Never use a
history-rewrite command without first producing the preview mapping and backup. Full mechanism
detail, backup procedure, and post-rewrite verification checklist: `reference/history-rewrite.md`.

## Post-rewrite verification

After a local rewrite:

- verify every targeted commit now parses under the shared Conventional Commit grammar;
- verify tree contents at rewritten tips match the pre-rewrite tips;
- verify branch/merge topology is preserved as intended;
- scan every rewritten message for AI/agent attribution and fail the rewrite (not just the
  push) if any is found;
- verify optional `Memory-Ref:` / `Decision-Ref:` trailers point to real `.memory/` files;
- provide an old-SHA → new-SHA mapping;
- run repository tests/checks when practical;
- report that remote history is still unchanged unless a separate push was explicitly
  authorized.

If the user later requests publication, prefer `git push --force-with-lease` over `--force`,
and confirm the exact remote/branches/tags before mutation.

## Reference files

- `reference/commit-standard.md` — the `commit-convention` grammar (types, shape markers,
  column alignment) plus optional `.memory/` traceability trailers, kept word-for-word
  identical to `commit-convention`'s copy since both skills must produce interchangeable messages.
- `reference/scopes.md` — the shared scope vocabulary, also kept identical to `commit-convention`'s
  copy.
- `reference/history-rewrite.md` — safety protocol and implementation guidance for the
  all-commit message rewrite mechanism.
