---
name: agentic-engineering-source-context
description: Ground an agentic engineering task in the exact source and version of a dependency, SDK, framework, generated client, or internal library instead of guessing from incomplete documentation. Use when APIs are uncertain, examples conflict, a fast-moving dependency is involved, an agent invents symbols, or a user asks to inspect implementation details before integrating. Prefer repository and installed-package evidence; acquire or vendor external source only with authorization. Do not use when the project's own code and authoritative version-matched documentation already answer the question.
---

# Agentic Engineering Source Context

Find the smallest version-matched evidence set that answers the implementation question. Do not load an entire repository into the conversation.

## Establish the exact target

1. Read repository instructions and identify the dependency or internal component in question.
2. Determine the version, commit, generated-client revision, or local workspace package actually used. Check the manifest and lockfile rather than assuming the latest release.
3. Write down the concrete question: symbol name, call pattern, data shape, lifecycle, error behavior, or extension point.

## Search evidence in priority order

1. Existing application usage and tests in the current repository.
2. Installed package source, type declarations, generated code, or vendored source matching the locked version.
3. A project-provided reference checkout with a known commit or tag.
4. Official source or documentation for the matching version when local evidence is insufficient.

Ask before cloning, downloading, vendoring, or adding large reference trees unless the user already authorized that acquisition. Keep reference source outside production paths and do not edit it as part of the implementation.

## Trace the implementation

- Search for exact exported symbols, interfaces, constructors, and error types.
- Read definitions together with representative callers and tests.
- Follow re-exports to the defining module.
- Check version-specific examples against the implementation before copying them.
- Record concise evidence as `path:line`, symbol, and version or commit. Distinguish direct evidence from inference.

If sources disagree, prefer the code matching the project's locked version and explain the discrepancy.

## Implement from the evidence

1. Reuse the dependency's supported public API unless the user explicitly accepts internal API risk.
2. Follow established initialization, cleanup, async, and error-handling patterns.
3. Build the smallest integration that answers the requested use case.
4. Add a focused test or compile/typecheck signal that would fail if the inferred API were wrong.
5. Cite the source files and symbols used in the handoff.

## Persist context sparingly

When future tasks will need the same source, use a predictable location such as `reference/repos/<host>/<owner>/<repo>` and record its commit or tag in the project's agent instructions. Ensure the project intentionally tracks or ignores that directory. Do not duplicate source that is already available in an installed package or workspace checkout.

## Use this integration prompt

```md
Integrate <library or component> for <use case>.

First determine the exact version used by this project. Search existing usage, tests, installed or vendored source, and then version-matched official source if needed. Identify the defining symbols and representative callers before coding. Implement the smallest supported integration, verify it with a focused check, and report the version plus the source files and symbols that informed the change. Do not guess API names or acquire a new source checkout without authorization.
```

## Verify completion

- Confirm the evidence matches the dependency version used by the project.
- Confirm the implementation relies on supported symbols or explicitly documents internal API risk.
- Confirm a focused check exercises the integration contract.
- Confirm the handoff separates source-backed facts from inference.
