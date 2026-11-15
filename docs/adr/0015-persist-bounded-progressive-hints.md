# ADR 0015: Persist bounded progressive hints

Status: Accepted within the owner's progressive-hints implementation request.

Date: 2026-11-15

## Decision

Add three explicitly requested levels per immutable revision: conceptual nudge, approach, then pseudocode. Next.js owns hint requests, lifecycle, dispatch allowance and PostgreSQL writes; FastAPI/Pydantic AI generates one hint per dispatch. Preserve ADR 0014's plain domain/application models, application services/interfaces and independent Pydantic boundaries. Coaching is excluded.

Only learner-facing challenge content and earlier accepted hints are sent to the provider. Drafts, submitted code, reference solutions and withheld cases are excluded. Render hint text as text, never HTML or executable code. The prompt and deterministic checks reject fenced/full-function output, but cannot prove semantic correctness or absence of every possible spoiler. Manual quality evaluation is separate from software tests and offline CI.

Each level has one durable initial dispatch and at most one explicit retry. Revision/level uniqueness, request identity and transactional claims prevent repeated or concurrent actions from spending another initial dispatch. Reads, reloads and polling never dispatch. Uncertain calls consume their allowance; stale requests become interrupted, and late results cannot overwrite a terminal state or newer dispatch. Failed/interrupted states and provenance are retained. Levels unlock only after the preceding hint is ready.

Add custom migration 0009 after reviewing retained history through 0008 and the reserved legacy 0005. Preserve every existing migration/snapshot and volume. Hint completion and attempt submission use the same revision lock as solution reveal. Attempts snapshot the highest ready hint level on the server; retries and later assistance never rewrite earlier snapshots. This records available assistance, not attested viewing. Existing attempts default to zero recorded hints.

Hints have a separate explicit `PRACTICE_HINTS_ENABLED=1` switch; provider credentials/model remain in Python. All SDK/framework/transport retries are disabled. The runner cannot invoke paid hint operations. No dependency, server execution, database-owner or deployment change is introduced.

## Validation and live evaluation

Cover core import direction, wire-schema parity, bounded provider transport, lifecycle/retry exhaustion, stale and late results, ordering, immutable snapshots, migration upgrades, reload/recovery, origin rejection and preservation of drafts/verdicts. CI uses typed synthetic providers and disposable PostgreSQL. The owner separately selected `gpt-6-luna` with USD 1 total for manual hint-quality evaluation; output acceptance and software checks remain distinct evidence.
