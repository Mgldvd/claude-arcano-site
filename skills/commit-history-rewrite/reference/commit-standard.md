# Repository commit standard

This project uses the structured Conventional Commits variant defined by
[`commit-convention`](https://github.com/Mgldvd/commit-convention) — the same grammar and type
vocabulary as Conventional Commits 1.0.0, plus a fixed monochrome shape marker per type, a
column-aligned colon, and a shared cross-project scope vocabulary — with a small set of optional
Git trailers added on top that link implementation changes to `.memory/`. Kept word-for-word
identical to `commit-history-rewrite`'s copy and to the upstream `commit-convention` skill, since
each skill folder must stay self-contained rather than reading another skill's files at runtime.

## Contents

- [Format](#format)
- [Allowed types](#allowed-types)
- [Shape per type](#shape-per-type)
- [Scope](#scope)
- [No AI/agent attribution, ever](#no-aiagent-attribution-ever)
- [Evidence rule](#evidence-rule)
- [First commit](#first-commit)
- [Optional project-memory trailers](#optional-project-memory-trailers)
- [Examples](#examples)

## Format

```text
<type>(<scope>)<!>: <shape> - <imperative description>
```

Pad `<type>(<scope>)<!>` — everything **before** the colon — with trailing **dots** (`.`) to
column 19, then append `: `. Dots, not spaces: many git GUIs and GitHub's own web commit list
collapse runs of multiple spaces, silently destroying space-based padding — dots survive that
untouched. This only produces true pixel alignment in a monospace view (terminal, `git log`,
most git clients); a proportional-font renderer can't align perfectly regardless of fill
character, since character width itself varies there — but a consistent dot count still reads as
a deliberate, structured line even where it isn't pixel-aligned. `<scope>` is optional; when
omitted, pad `<type><!>` the same way. This is why scope words are capped at 8 characters (see
`reference/scopes.md`) — the longest type (`refactor`, 8 chars) plus `(` + an 8-char scope + `)`
+ `!` is exactly 19, so nothing ever pushes the colon past that column. Every other space in the
format (after the colon, around the ` - `) is a single space, never a run — dots would visually
collide with the ` - ` that separates the shape from the description.

## Allowed types

Fixed vocabulary — never invent a new one:

- `feat` — new user-visible capability
- `fix` — bug fix
- `docs` — documentation-only change
- `style` — formatting-only, no behavior change
- `refactor` — structural change with intentionally unchanged behavior
- `perf` — performance improvement
- `test` — test-only change
- `build` — build system or dependency change
- `ci` — CI/CD configuration
- `chore` — repository maintenance not covered above
- `revert` — revert of an earlier change

A repository may restrict the allowed types/scopes or subject length, but should remain
parseable as Conventional Commits unless the user explicitly chooses a different standard.

## Shape per type

Monochrome Unicode geometric shapes, not emoji — they render as plain text glyphs in any font,
never in color, so the marker stays discreet instead of competing for attention:

| Shape | Types | Meaning |
|---|---|---|
| `●` | `fix` | Bug fix |
| `△` | `perf` | Performance improvement |
| `◆` | `refactor` | Structural change, behavior intentionally unchanged |
| `▲` | `feat` | New user-visible capability |
| `□` | `docs` | Documentation-only change |
| `◇` | `style` | Formatting-only, no behavior change |
| `■` | `build`, `ci` | Build system, dependencies, or CI/CD config |
| `○` | `chore`, `test`, `revert` | Repository maintenance, test-only change, or reverting an earlier commit |

## Scope

A noun naming the architectural area touched, chosen from `reference/scopes.md` — generic and
layer-based (`api`, `db`, `auth`, `ui`, ...), not a specific folder/module name from any one
repo, so it stays meaningful when reused in a different project. Optional; omit it when no
single area fits. Max 8 characters, enforced by the alignment guarantee above.

If nothing in the list fits, add the closest new scope to `reference/scopes.md` (same 8-char
limit, same generic/layer-based spirit) instead of inventing an ad-hoc word inline — that's what
keeps the vocabulary reusable across projects instead of drifting into per-repo dialects.

## No AI/agent attribution, ever

Never add a `Co-Authored-By:` trailer, "Generated with [tool]", session link, or bracket
tag naming an AI assistant/agent to any commit message covered by this standard — including
messages produced by a full-history rewrite. This applies regardless of which skill or tool
authors the message, and cannot be opted back into by a repository convention or a user
request for that specific line. Human co-authorship and standard human trailers
(`Signed-off-by`, issue references) are unaffected. See `commit-convention/SKILL.md` for the full
rule and its enforcement layers (git hook, settings, validator).

## Evidence rule

Build the message from the **actual diff**. Do not invent motivation from a previous commit
message. A body may explain observed behavior, constraints, migrations, or a rationale that
is supported by repository evidence.

## First commit

The very first (root) commit of any repository adopting this convention is always exactly:

```text
init...............: ○ - 🌱.
```

Verbatim, every project — not project-specific, so it's instantly recognizable as "a repo using
this convention" regardless of what the repo actually is. `init` is a one-time exception to the
fixed type vocabulary above; it's never used again after the first commit. The trailing `.`
after the emoji is a plain stylistic terminator, nothing more. This is the one place this
standard uses an emoji at all — every other marker is the monochrome shape above.

## Optional project-memory trailers

Use these only when a concrete `.memory/` document already exists or is being created in
the same change. Never invent a reference just to populate a footer.

```text
Memory-Ref: .memory/architecture/authentication.md
Decision-Ref: .memory/decisions/0007-use-signed-cookies.md
```

Rules:

- `Memory-Ref:` links the commit to durable project knowledge affected by the change.
- `Decision-Ref:` links implementation to a specific architectural/project decision.
- Both trailers may appear more than once when several concrete documents apply.
- Keep standard footers such as `BREAKING CHANGE:`, issue references, or human
  `Signed-off-by:` when supported by the repository or explicitly requested.
- These trailers are traceability metadata, not a substitute for updating `.memory/`.

## Examples

```text
feat(auth).........: ▲ - replace redis sessions with signed cookies

Move session persistence to encrypted signed cookies and remove the runtime Redis
session dependency.

Decision-Ref: .memory/decisions/0007-use-signed-cookies.md
Memory-Ref: .memory/architecture/authentication.md
```

```text
fix(payment).......: ● - prevent duplicate refund processing

Treat provider event IDs as idempotency keys before creating refund work.

Memory-Ref: .memory/architecture/payments.md
```

```text
refactor(api)!.....: ◆ - remove legacy v1 response envelope

BREAKING CHANGE: clients must consume the v2 response shape directly.
Decision-Ref: .memory/decisions/0012-remove-v1-envelope.md
```

```text
chore(deps)........: ○ - bump the http client to v3
```
