# Fixed-exercise persistence

The owner authorized this slice on 2026-11-14. Next.js and Drizzle own all product writes; no Python service or execution on the host is introduced.

## Migration review

Committed SQL and snapshots end at 0004. The original checkout contains an uncommitted 0005 decks/cards migration; retain it there and reserve its number. Its PostgreSQL container is stopped, so the applied database state is unverified. Do not infer state from checkout files or start/reset its volume.

Add 0006 as a custom, additive Drizzle migration using the existing journal and ledger. Drizzle orders migration execution by journal timestamps, so the reserved index does not require a replacement 0005. Preserve all prior SQL/snapshots. Do not generate a schema diff from the retired models: that could propose destructive drops. Automated diff generation remains unavailable until legacy schema ownership is explicitly reconciled.

The migration entrypoint checks ledger hashes/timestamps against retained files and the known original 0005 fingerprint, rejects an unknown history or untracked legacy tables, takes an advisory lock and uses the existing Drizzle migrator. Application startup never migrates automatically. Validate on a disposable PostgreSQL container with synthetic data, including fresh and legacy-0005 histories; do not mutate an existing database in this task.

The default practice database uses its own Compose project, named volume and loopback port 5433; the legacy Compose configuration stays unchanged. `pnpm db:migrate` requires an explicit URL. Tests use ephemeral containers with tmpfs and random loopback ports.

## Records and execution

- A Challenge has a stable identity. Challenge Revision stores the complete accepted synthetic content and its digest. Revision rows cannot be updated or deleted; changes require another revision.
- Practice Draft stores mutable source and an optimistic integer version. Stale writes return a conflict and preserve both versions for an explicit choice. A per-tab sessionStorage recovery copy covers edits before server acknowledgment and survives reloads, keeping its original version until the conflict is resolved. Tabs cannot overwrite each other's recovery copies; unsaved copies last only for that tab's session, so save before closing it.
- Attempt stores an idempotent submission ID, exact source snapshot, immutable revision/runtime/job/digest bindings and mode. A bounded report can be attached once. Pending report recovery uses one browser key per attempt, so tabs do not overwrite each other; blocked browser storage is disclosed. The source and completed report cannot be rewritten or deleted. A submission with no report remains visibly unfinished after reload.
- Run examples and Check solution create durable attempts before browser execution. Reports must match the saved job, revision, source/cases digests, mode and runtime. Replayed completion is idempotent; a conflicting report is rejected. Browser results remain untrusted self-study evidence.

Versioned Zod runtime schemas own HTTP data shapes and derive TypeScript contracts; export JSON Schema artifacts for inspection and later Python integration. The normal session view excludes references and unrevealed cases. A separate run envelope carries the exact evaluation cases to the local owner. Explicit reference execution stays separate from learner attempts.

## Local capability and privacy boundary

Product mutations require the exact loopback application Host/Origin and JSON with a bounded body. The runner origin is rejected. No CORS access, credentials or privileged product helpers are added to the runner. Responses containing code use no-store. SQL/provider errors and submitted source are never logged or echoed in error messages.

## Acceptance

Open → edit → save → run/check → record source/results → reload → resume. Cover failed saves, immediate reload, concurrent-tab conflict, lost responses, immutable revisions/submissions, wrong/stale reports, interrupted runs, persistence across restart, and the existing runner isolation/recovery suite. Use synthetic content for database/browser tests and captures.

## Test fixtures and limits

The known original 0005 DDL is copied byte-for-byte into a synthetic migration-test fixture, verified against its recorded hash. It is never applied by the application migration journal. Database-owner DDL can bypass triggers; these constraints protect product write paths, not a hostile PostgreSQL administrator. Recent history is bounded to 20 attempts per session view; older records remain in PostgreSQL. Reload does not automatically rerun an unfinished attempt. A retry uses a new run unless recovering an idempotent submission or completion.

## Verified local result — 2026-11-14

- `pnpm repo:test:pr`: passed naming/import/architecture/size/ESLint/format checks, generated-contract drift check, package/web/eval typechecks, Compose config, 16 convention fixtures, 9 web unit/history/contract tests, 8 real-PostgreSQL integration tests and the eval scaffold checks.
- `pnpm web:test:browser`: 20 tests passed in installed Google Chrome. Coverage includes fresh-browser database resume, exact submitted snapshots, lost save/result responses, immediate recovery, concurrent-tab conflicts, per-attempt recovery queues, unavailable browser storage, unfinished runs, origin/contract rejection, desktop/mobile and all prior runner isolation/recovery cases.
- Live Chrome: entered a synthetic solution, saved, checked all six cases, reloaded and observed the same draft and saved attempt. Automated normal-flow console/network checks were clean; negative-path failures were deliberately injected by their tests.
- Migrated the fresh practice database on port 5433. The stopped legacy container and original dirty checkout were not changed. All 10 prior SQL/snapshot files remain byte-for-byte unchanged; prior journal entries retain their original values.

Browser screenshots contain only synthetic code and live under ignored `apps/web/test-results`. The migration tests use only disposable databases; no private learner data or live provider calls were used.
