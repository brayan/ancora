# Execution Plans

Execution plans are focused implementation plans for multi-step work. They sit between ADRs and code changes.

## When To Use

Create an execution plan when a task spans multiple boundaries, changes a user-facing workflow, or needs sequencing across docs, prompts, schemas, API behavior, UI, evals, and observability.

Do not use execution plans to bypass ADRs. Architecture, ownership, storage, provider, auth/account, privacy, or deployment changes still need ADR coverage.

## Suggested Format

```md
# Plan Title

## Goal

## Scope

## Out of Scope

## Current Context

## Implementation Steps

## Validation

## Risks

## Rollback
```

## Status

Store active plans in `docs/exec-plans/`. Keep completed plans if they remain useful historical context; otherwise summarize the decision in an ADR or canonical doc and remove stale execution detail in a dedicated docs cleanup.

## Privacy

Plans must not include private source material. Use synthetic examples, IDs, and trace references.
