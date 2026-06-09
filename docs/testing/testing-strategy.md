# Testing Strategy

## Status Summary

| Status | Scope |
|---|---|
| Implemented | Change-based test policy, command surface, repository guard scripts, focused credentials auth tests, account-scope helper tests, and migration shape checks. |
| In progress | Portfolio baseline and account-aware server tests are expanding as product behavior deepens. |
| Planned | Source ingestion, RAG, API/server, UI, Playwright, privacy artifact, eval, and AI failure-path tests. |
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
| Unit tests | In progress | Implemented credentials registration/login, duplicate email, invalid credentials, session scope parsing, and account isolation helpers. Planned coverage includes chunking, citation parsing, prompt metadata, cost calculations, and schema validation. |
| Integration tests | Planned | Drizzle repositories, pgvector retrieval, account-scoped joins, prompt assembly, and trace reference persistence against PostgreSQL. |
| API/server tests | In progress | Auth service behavior is covered through focused server tests; route-handler contract tests remain planned. |
| UI tests | Planned | Source, deck, card, review, quiz, tutor, empty, loading, and error states. |
| Playwright tests | Planned | Critical browser workflows with synthetic content and no private screenshots. |
| Eval smoke tests | In progress | Internal TypeScript eval runner boundary and future deterministic smoke suites. |
| Docs checks | Implemented | File existence, manifest routing, and targeted status/privacy searches for docs-only work. |

## Account-Isolation Tests

Account isolation is required because account-owned source material is private. Implemented foundation tests prove that missing session/account context fails closed and account-scoped records reject cross-account access. Planned product tests should prove:

- A user cannot read sources, chunks, cards, reviews, eval runs, or traces from another account.
- Retrieval queries filter by account before vector results are used.
- Generated artifacts persist account IDs and source/chunk references.
- API errors do not leak another account's identifiers or source text.
- Fixtures use synthetic account and source IDs.

Current focused coverage:

- Registration creates a user/account identity through the credentials service contract.
- Login succeeds only with the correct password.
- Duplicate emails are rejected after normalization.
- Missing account scope throws a 401-style authorization error.
- Cross-account records throw a 403-style authorization error.
- The initial Drizzle migration includes Auth.js, account, source, chunk, trace-reference, and pgvector foundations.

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
| Server auth/data foundation | `pnpm --filter @ancora/web test`, `pnpm --filter @ancora/web typecheck`, `pnpm --filter @ancora/web exec drizzle-kit check --config drizzle.config.ts`, and Docker Compose config validation. |
| Server AI runtime | `pnpm web:typecheck`, server tests, schema tests, and relevant eval smoke checks. |
| Eval runner | `pnpm eval:typecheck`, `pnpm eval:test`, `pnpm eval:smoke`. |
| Repo governance or scripts | `pnpm repo:test:fast -- --describe`, relevant lane command, and shell/config validation. |

If an expected command is missing, report the gap instead of inventing a substitute.
