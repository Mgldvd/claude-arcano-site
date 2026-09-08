---
type: Decision
title: <Observed decision title>
description: <One sentence describing the durable choice reconstructed from history.>
status: draft
decision_status: accepted
date: <YYYY-MM-DD or "historical; exact date uncertain">
commits:
  - <implementation SHA(s), used as evidence pointers rather than rationale>
# supersedes:
#   - 000N
sources:
  - id: <decision-history>
    resource: <git:path:scope or repo:path>
    title: <Evidence used to reconstruct this decision>
generated:
  by: agent/memory-retroactively
  at: <ISO-8601 timestamp>
---

# 000N. <Observed decision title>

## Context

<Describe the before-state and the concrete problem/constraint only when supported by
repository evidence. If the original rationale cannot be established, say so.>

## Decision

<Describe the observable architectural/domain choice reflected in the implementation.>

## Alternatives considered

<Include only alternatives actually visible in history/docs. Otherwise remove this
section. Do not invent hypothetical alternatives.>

## Consequences

<Describe observable consequences/trade-offs. Mark interpretations as inferred when they
are not directly evidenced.>

## Reconstruction note

<Briefly distinguish observed facts from inferred rationale and identify what a maintainer
should verify before changing `status` from `draft` to `stable`.>
