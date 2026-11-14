# Programming Practice Execution Plan

## Goal and authorization

Owner-approved local single-user pivot; selected Next.js/React/TypeScript + FastAPI/Pydantic AI. Current implementation scope: architecture reconciliation, retirement of auth/sources/decks/cards, and synthetic browser runner spike. ADR 0011 is authoritative.

## Sequence

1. Record the pivot, ownership, privacy, content mode and lifecycle. Update manifest/shards/canonical docs.
2. Remove retired routes, UI, server helpers, contracts, auth dependencies and stale current-product tests. Preserve original checkout, historical SQL/snapshots and database volumes. Pause migration/seed commands pending persistence review.
3. Prove an isolated, dedicated-origin disposable Pyodide worker with a fixed synthetic exercise, bound messages, Stop/timeouts/output caps/reset, no contamination and blocked application/external requests. Record Chrome evidence and memory/latency limitations.
4. Later: fixed-exercise editor + durable draft/attempt/revision workflow using PostgreSQL/Drizzle. Review schema transition before generating/applying migrations. Version runtime-validated wire contracts and generated TS types.
5. Later: FastAPI/Pydantic AI generation, versioned prompts, bounded correction, recent-exercise context and failure recovery. Select model and real-eval budget first; use typed fakes before paid calls.
6. Later: progressive hints, selected-attempt coaching, explicit reveal, assistance tracking and history.

## Runner acceptance

Correct/incorrect/exceptional functions; comprehension false-positive/inconclusive handling; empty/boundary/duplicate/order/mutation cases; infinite loop timeout and Stop; output caps; next-run recovery; reference/learner separation; stale/malformed/oversized message rejection; blocked privileged/paid/external requests even through Python-JS interop; startup/reset timing; bounded memory probe and explicit absence of a hard process quota.

## Validation

Narrow naming/lint/type/unit checks, dedicated real-Chrome browser suite, desktop/mobile keyboard/focus/overflow checks, then repo completion lanes. Governance guards only verify routing/language; the eval scaffold is not Python/runner evidence. Use synthetic code and no live LLM calls. See docs/testing/testing-strategy.md and docs/architecture/runner-spike.md.

## Rollback and publication

The original dirty checkout remains intact. Revert the worktree's task-owned changes to recover this branch; do not reset/delete the original checkout. No database rollback is needed because no data/migrations are applied. Draft PR #6 introduces source ingestion; recommend a new pivot PR rather than silently repurposing it. Do not publish/commit or change that PR without a publication request. Review ADR/product first, removal scope second, runner capability/tests third.

## Current handoff

Architecture reconciliation, retired runtime cleanup and runner spike are implemented in the task worktree. See the runner report for 11 real-Chrome checks and remaining limits. Original uncommitted deck/card code and migration 0005 remain in the original checkout; reconcile the actual database before the persistence slice. The initial implementation handoff preceded publication. Live provider calls have not been performed; publication uses a fresh draft PR and leaves PR #6 unchanged.
