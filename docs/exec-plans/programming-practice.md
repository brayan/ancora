# Programming Practice Execution Plan

## Goal and authorization

Owner-approved local single-user pivot; selected Next.js/React/TypeScript + FastAPI/Pydantic AI. Current implementation scope: the completed pivot/runner, persistence and generation/CI slices plus merged solution reveal/tracking and the owner-authorized progressive-hints slice. ADR 0011 is authoritative.

## Sequence

1. Record the pivot, ownership, privacy, content mode and lifecycle. Update manifest/shards/canonical docs.
2. Remove retired routes, UI, server helpers, contracts, auth dependencies and stale current-product tests. Preserve original checkout, historical SQL/snapshots and database volumes. Pause migration/seed commands pending persistence review.
3. Prove an isolated, dedicated-origin disposable Pyodide worker with a fixed synthetic exercise, bound messages, Stop/timeouts/output caps/reset, no contamination and blocked application/external requests. Record Chrome evidence and memory/latency limitations.
4. Implemented in the persistence worktree: fixed-exercise editor + durable draft/attempt/revision workflow, reviewed additive migration 0006, guarded ledger upgrades, runtime schemas with derived TS contracts and generated JSON Schema. See docs/architecture/practice-persistence.md.
5. Implemented: bounded FastAPI/Pydantic AI generation, versioned prompts, explicit correction, recent-exercise context, recovery and GitHub Actions. See [active plan](challenge-generation.md) and ADR 0013. The owner selected gpt-6-luna and USD 1 total live evaluation budget; CI remains offline.
6. Implemented in PR #10: confirmed solution reveal, durable first-reveal records, attempt assistance snapshots and recent history. See [assistance](../architecture/practice-assistance.md). Sync the merged shared parameter checker with exact upstream provenance.
7. Current slice: progressive hints, durable requests, bounded retries and assistance snapshots under ADR 0015. Manual gpt-6-luna quality evaluation has a separate USD 1 total cap; CI stays offline.
8. Next: selected-attempt coaching, with explicit source sharing and separately approved live evaluation.

## Runner acceptance

Correct/incorrect/exceptional functions; comprehension false-positive/inconclusive handling; empty/boundary/duplicate/order/mutation cases; infinite loop timeout and Stop; output caps; next-run recovery; reference/learner separation; stale/malformed/oversized message rejection; blocked privileged/paid/external requests even through Python-JS interop; startup/reset timing; bounded memory probe and explicit absence of a hard process quota.

## Validation

Narrow naming/lint/type/unit checks, dedicated real-Chrome browser suite, desktop/mobile keyboard/focus/overflow checks, then repo completion lanes. Governance guards only verify routing/language; the eval scaffold is not Python/runner evidence. Use synthetic code and no live LLM calls. See docs/testing/testing-strategy.md and docs/architecture/runner-spike.md.

## Rollback and publication

The original dirty checkout remains intact. Persistence adds tables without dropping history; never drop/reset an existing database as rollback. Revert the worktree's task-owned changes to recover this branch; do not reset/delete the original checkout. Custom additive migrations are tested on disposable databases; rollback never resets retained data. Draft PR #6 introduces source ingestion; recommend a new pivot PR rather than silently repurposing it. Do not publish/commit or change that PR without a publication request. Review ADR/product first, removal scope second, runner capability/tests third.

## Current handoff

PRs #7–#10 delivered runner isolation, durable practice, generation/CI and explicit solution reveal. This branch adds progressive hints with migration 0009 and no dependency changes. Only disposable databases are migrated by tests. Coaching is excluded; manual hint-quality evaluation and owner output acceptance remain distinct from deterministic software checks. See [hint ownership, lifecycle and evaluation](../architecture/progressive-hints.md).
