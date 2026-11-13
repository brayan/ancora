# 0011: Focus Ancora on Local Programming Practice

## Status

Accepted — product direction and implementation through the runner spike authorized by the owner on 2026-11-13.

## Context

The owner replaced the earlier source-grounded flashcard direction with short programming challenges for personal local use. Authentication, sources, decks and cards are no longer requirements. Next.js App Router, React, TypeScript, FastAPI and Pydantic AI are selected. This is a product pivot, rather than an additive account-scoped feature.

## Decision

- Ancora is a local, single-user Python programming-practice application. No login, users, accounts, memberships or seeded identity are required. Public hosting and multi-user access require a later ADR.
- Next.js owns UI, browser-facing endpoints, generation lifecycle/budgets and future durable product records. PostgreSQL and Drizzle remain the sole persistence/migration owner. Python does not connect to the product database.
- FastAPI and Pydantic AI own complete challenge generation, bounded structural validation/correction and optional requested coaching. This service is planned; it is not scaffolded by the runner spike. OpenAI remains the default provider; credentials belong only in the Python environment.
- The LLM generates actual problems, structured function contracts, constraints, public examples, reference solutions and candidate cases. Fixed synthetic exercises are only spike/test inputs.
- Content mode is `concept_generated`, without invented Sources, chunks or citations. Source-grounded learning and RAG are deferred.
- Challenge, immutable Challenge Revision, Practice Draft, Attempt, Generation and Assistance are the canonical product records. No Card/Review compatibility bridge or account IDs are carried into them.
- Generated and submitted Python executes only in disposable browser workers on a dedicated loopback runner origin. Never execute it in Next.js, FastAPI or host Python.
- The runner serves only allowlisted static runtime assets, with CSP blocking application/external network access. It has no secrets, database access, paid endpoints or privileged bridge. Its messages are bounded result data; they cannot authorize generation, correction or coaching.
- Binding a result to job/revision/source/cases/runtime digests rejects stale data, but is not hostile-code attestation. Browser results are untrusted self-study evidence. Correctness, technique and coaching remain separate.
- Generation has one durable allowance for the initial provider request plus at most one correction. All SDK/framework/transport retries must fit that allowance. An uncertain provider failure consumes its dispatch and requires an explicit recovery action. Runner reports cannot trigger paid correction automatically.
- Historical SQL migrations/snapshots and existing database volumes are retained unchanged. The spike does not open the database or generate/apply migrations. Active legacy models are retired; migration generation/application is paused until the persistence slice reviews the existing data and schema transition.

## Supersession

This ADR supersedes ADR 0003's required authentication, ADR 0009's exclusive TypeScript AI-runtime ownership, and ADR 0010's blanket Python deferral for this programming service. It narrows ADR 0005 to PostgreSQL persistence; vector retrieval is deferred. ADR 0002 remains historical and does not restore a general Python product API.

## Alternatives and consequences

Preserving the old product as parallel features would retain account/source coupling with no present learner benefit. A full repository or database reset would discard useful tooling and unknown local data. The chosen approach retires old application surfaces in an isolated worktree while retaining migration history and the original checkout.

The runner adds a small static origin and a pinned WebAssembly runtime. The spike must prove Stop, timeout, output limits, recovery, separate runs, message validation and blocked privileged requests before generation work begins. It cannot guarantee a hard browser-process memory quota or independent semantic correctness. An unsuitable browser runner requires another reviewed isolation design, never unrestricted host execution.
