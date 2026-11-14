# Testing Strategy

Use narrow checks and synthetic code. The current implementation persists fixed practice and retains the isolated browser execution boundary. Generation remains a later slice.

| Command | Evidence |
|---|---|
| pnpm code:check | Shared formatting, braces, test naming and web naming/import/architecture/size policies. |
| pnpm quality:test | Positive/negative convention fixtures, including malformed structure, imports and stale size exceptions. |
| pnpm web:lint | Web naming, imports, architecture, size and ESLint for app/static delivery. |
| pnpm web:typecheck | TypeScript contracts and UI/browser tests. |
| pnpm contracts:check | Generated JSON Schema matches the canonical runtime schemas; TS contracts derive from those schemas. |
| pnpm web:test:db | Disposable real PostgreSQL: fresh/legacy migration, draft conflicts, immutable snapshots/revisions, report binding/idempotency and unfinished attempts. |
| pnpm web:test | Runner protocol limits/bindings and preserved historical migration checks. |
| pnpm web:test:browser | Disposable PostgreSQL and installed Google Chrome: saved draft/attempt reload, save/result failures, concurrent tabs, unfinished submissions, Host/Origin/contracts and real Pyodide execution, UI states, Stop/timeout/output/reset, mutation/technique, stale messages, network canary, static server restrictions, malformed-request survival and retired-route checks. |
| pnpm packages:typecheck | Shared packages. |
| pnpm repo:test:context | Governance presence/language only. |
| pnpm repo:test:task | Code quality fixtures plus static/unit/eval scaffold completion lane. |
| pnpm repo:test:pr | Context + task lanes; run browser suite separately for this change. |

The browser config starts distinct loopback application and runner origins, without reusing existing servers. Install dependencies with `pnpm install --frozen-lockfile`; Google Chrome must be installed. Chrome screenshots in ignored test-results contain only the fixed synthetic exercise. Traces/videos are off so future private code is not captured by default.

No live LLM calls or private learner data are used. Database and browser tests use real disposable PostgreSQL with synthetic data, never an existing database or volume. Historical SQL checks protect retained migration invariants; they do not claim the retired product remains active. No Vitest or Python-service test commands exist. Ruff, strict Pyright, pytest and Python consumer generation belong to the later service slice. JSON Schema exports already exist for the versioned practice HTTP contract. The TypeScript eval CLI still returns an empty scaffold result, not challenge quality evidence.

Future tests: provider correction budgets across retry layers, pending/interrupted generation, optional assistance and privacy-safe telemetry. See docs/architecture/runner-spike.md for measured limitations.

[Code quality conventions](../engineering/code-quality-conventions.md) distinguish automated checks from contextual paragraph review. Run the latter before checks; a formatter pass does not prove that code is grouped by responsibility.
