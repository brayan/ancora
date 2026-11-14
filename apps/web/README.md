# Ancora Web

Next.js App Router/React/TypeScript programming workspace. Thin `app/api/practice` routes delegate to `server/programming-practice`; feature-owned UI coordinates drafts and isolated runs. PostgreSQL/Drizzle owns durable records. The static runner has a separate origin and no database capability.

Follow the [root startup](../../README.md). The practice database uses port 5433 and a separate named volume. `pnpm db:migrate` requires an explicit DATABASE_URL and verifies known migration history before applying additive 0006/0007. Historical SQL/snapshots remain unchanged; automatic schema-diff generation stays unavailable because legacy models are retired.

Drafts save optimistically, with browser recovery for pending writes and explicit conflict choices. Attempts preserve the submitted snapshot and accept one bound report. Reload restores the draft and latest saved attempt; recent attempts can be inspected without replacing the editor. References are fetched only by an explicit action and reference runs do not become learner attempts.

Generated challenges use the bounded Python service on 8001. Next.js reserves each provider dispatch durably, saves immutable candidates and accepts bound reference checks from the isolated runner. Opening a ready challenge saves the current draft first; each tab retains its selected revision across reloads. Provider credentials stay in Python, and generation sends no learner submissions.

Commands: `pnpm web:lint`, `pnpm web:typecheck`, `pnpm web:test`, `pnpm web:test:db`, `pnpm web:test:browser`, `pnpm contracts:check`. The database/browser wrappers use disposable synthetic databases and a test-only fake provider; automated checks make no live API calls.

See [persistence](../../docs/architecture/practice-persistence.md), [generation](../../docs/architecture/challenge-generation.md), [ADR 0013](../../docs/adr/0013-bounded-generation-and-automated-checks.md) and [runner limits](../../docs/architecture/runner-spike.md).
