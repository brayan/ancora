# 0012: Persist Fixed Practice With Additive Migrations

## Status

Accepted within the owner's fixed-exercise persistence request on 2026-11-14.

## Decision

Next.js and Drizzle own Challenge, immutable Challenge Revision, mutable versioned Practice Draft and durable Attempt records. PostgreSQL triggers reject revision mutation and attempt snapshot rewriting; an attempt accepts one terminal report. Missing reports remain unfinished rather than receiving an invented verdict.

Continue the existing Drizzle migration ledger. Preserve committed migrations/snapshots 0000–0004, reserve the original checkout's uncommitted legacy 0005, and append additive 0006. The migration preflight checks known hashes/timestamps and refuses unknown or incomplete history. Do not infer applied state from a source checkout. No schema-diff generation is exposed while retired schema definitions are absent; that could produce destructive drops.

Local practice startup uses a separate loopback PostgreSQL container/volume on port 5433. The stopped legacy container, its volume and the original checkout remain untouched. An explicit DATABASE_URL can target a reviewed existing database through the same migration preflight. Startup never applies migrations automatically.

The browser keeps an acknowledged draft version and a local recovery copy. Stale writes require an explicit choice. Submissions persist before execution and retain exact source, revision/runtime/job/digest bindings. Completion retries are idempotent. This is local single-user storage without authentication or accounts.

Product HTTP data is runtime-validated and versioned; TypeScript types derive from those schemas and generated JSON Schema is checked for drift. References/cases are projected separately for explicit local execution. The runner remains isolated and receives no database helper or credentials; its reports remain untrusted self-study evidence.

## Consequences

Existing databases are not reset, rebased or stripped of retired tables. Fresh practice databases replay retained history before the additive practice migration. Synthetic disposable-database tests cover both fresh history and a known-0005 upgrade. FastAPI/Pydantic AI, model calls, assistance and generated challenges remain later work.

See [persistence contract and migration review](../architecture/practice-persistence.md).
