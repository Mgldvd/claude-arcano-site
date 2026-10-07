# Optional full-history commit-message rewrite

Use this only when the user explicitly chooses to normalize **all** reachable commit
messages in a repository. The default is to keep history unchanged. If the repository has
a `.memory/` bundle (e.g. built by `memory-adr-okf` or `memory-retroactively`), incorporate
its `Memory-Ref:` / `Decision-Ref:` trailers per the rules below; if it doesn't, skip those
trailers entirely — this skill does not require `.memory/` to exist.

## Goal

Rewrite commit **messages only** so they follow `reference/commit-standard.md`. Preserve
file trees, parent topology, authors, and original timestamps. Because commit objects change,
all rewritten commits receive new SHAs.

## Required preview

Before mutation, produce an old-SHA → proposed-message map by walking the selected refs in
topological order. Derive each message from its diff against its parent(s), not from its old
message. Old messages may be used only as secondary corroboration.

Each row should contain:

```text
old_sha	proposed_subject	type_scope	memory_refs	confidence
```

Flag ambiguous commits. A conservative `chore:` subject or retaining that individual old
message is safer than inventing intent.

## Backup

Before rewriting, require a clean worktree/index and create a recoverable backup, for example
a Git bundle or dedicated backup refs. Record branches, tags, and remotes.

## Rewrite mechanism

Prefer `git filter-repo` when available. Build a mapping from each original commit ID to the
full replacement message and use a commit callback that changes only `commit.message`. Do not
modify file contents, identities, timestamps, or parent relationships.

If `git filter-repo` is unavailable, explain the fallback and its trade-offs before using it.
Do not silently fall back to a more dangerous history-rewrite mechanism.

## Signatures and collaborators

Changing commit messages changes commit IDs and invalidates/removes cryptographic signatures
on rewritten commit/tag objects. Existing clones, open PRs, links, and branches based on old
SHAs may require coordination.

## Verify before any push

After rewriting locally:

1. validate every new message against `reference/commit-standard.md`, including its "No
   AI/agent attribution, ever" rule — scan all rewritten messages for `Co-Authored-By`,
   "Generated with", session links, or bracket tags naming an AI tool, and fail the rewrite
   if any are found instead of pushing;
2. compare rewritten tip trees with the pre-rewrite tip trees;
3. inspect merge topology;
4. confirm every `Memory-Ref:` / `Decision-Ref:` points to a real `.memory/` document;
5. retain the old-SHA → new-SHA map;
6. run repository tests/checks when practical.

Remote publication is a separate authorization. If explicitly requested, confirm the exact
remote refs and prefer `git push --force-with-lease` over `--force`.
