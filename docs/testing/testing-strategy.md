# Testing Strategy

## Status Summary

| Status | Scope |
|---|---|
| Implemented | Change-based test policy and command surface are documented. Repository guard scripts exist. |
| In progress | Portfolio baseline defines expected test categories before product behavior deepens. |
| Planned | Unit, integration, API/server, UI, Playwright, account-isolation, privacy, eval, and failure-path tests. |
| Deferred | Large-scale load testing, multi-tenant enterprise test matrices, and production chaos testing. |

## Principles

- Run the narrowest meaningful validation for the changed boundary.
- Treat auth and account ownership as product behavior, not a later security layer.
- Use synthetic or explicitly approved sample material only.
- Keep private source material out of fixtures, screenshots, logs, eval reports, and committed artifacts.
- Test grounding and failure behavior, not only happy-path generation.

## Test Layers

| Layer | Status | Expected Coverage |
|---|---|---|
| Unit tests | Planned | Pure chunking, citation parsing, prompt metadata, cost calculations, schema validation, and small workflow functions. |
| Integration tests | Planned | Drizzle repositories, pgvector retrieval, account-scoped joins, prompt assembly, and trace reference persistence. |
| API/server tests | Planned | Thin route handlers, server actions where used, auth enforcement, validation errors, provider failures, and response contracts. |
| UI tests | Planned | Source, deck, card, review, quiz, tutor, empty, loading, and error states. |
| Playwright tests | Planned | Critical browser workflows with synthetic content and no private screenshots. |
| Eval smoke tests | In progress | Internal TypeScript eval runner boundary and future deterministic smoke suites. |
| Docs checks | Implemented | File existence, manifest routing, and targeted status/privacy searches for docs-only work. |

## Account-Isolation Tests

Account isolation is required because account-owned source material is private. Planned tests should prove:

- A user cannot read sources, chunks, cards, reviews, eval runs, or traces from another account.
- Retrieval queries filter by account before vector results are used.
- Generated artifacts persist account IDs and source/chunk references.
- API errors do not leak another account's identifiers or source text.
- Fixtures use synthetic account and source IDs.

## Privacy Tests

Privacy-sensitive tests should inspect artifacts as well as responses:

- Logs do not include raw source text.
- Langfuse or OpenTelemetry metadata uses IDs, prompt versions, scores, and trace references where possible.
- Eval reports do not copy private source material.
- Screenshots use synthetic demo content only.
- Provider payload tests use redacted or synthetic examples.

## Failure-Path Tests

Planned failure-path tests should cover:

- Empty or low-quality retrieval results.
- Missing citations.
- Prompt-injection text inside source chunks.
- Provider outage, timeout, and malformed model output.
- Rate limits and retry exhaustion.
- Database connection failures.
- Cost guard threshold breaches.
- Trace creation failure that should not block user-safe fallback behavior unless auditability is required.

## Validation Cadence

| Change Type | Narrow Validation |
|---|---|
| Docs only | `test -f ...`, manifest inspection, targeted `rg` searches. |
| Web UI | `pnpm web:lint`, `pnpm web:typecheck`, `pnpm web:test`, focused Playwright tests when available. |
| Server AI runtime | `pnpm web:typecheck`, server tests, schema tests, and relevant eval smoke checks. |
| Eval runner | `pnpm eval:typecheck`, `pnpm eval:test`, `pnpm eval:smoke`. |
| Repo governance or scripts | `pnpm repo:test:fast -- --describe`, relevant lane command, and shell/config validation. |

If an expected command is missing, report the gap instead of inventing a substitute.
