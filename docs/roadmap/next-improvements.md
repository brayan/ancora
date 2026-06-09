# Next Improvements

## Status Summary

| Status | Scope |
|---|---|
| Implemented | TypeScript-first scaffold, governance, ADRs, command surface, portfolio evidence baseline, Auth.js credentials auth, account ownership, and Drizzle data foundation. |
| In progress | First product and eval boundaries are being prepared for vertical slices. |
| Planned | Source ingestion, chunking, embeddings, grounded tutor, flashcards, review loops, evals, tracing, monitoring, and deployment readiness. |
| Deferred | Uploaded file ingestion, separate services, Python runtime, Kubernetes, Terraform, Redis, PyTorch, mobile apps, and enterprise controls. |

## Near-Term Product Slices

| Priority | Status | Improvement | Evidence to Update |
|---|---|---|---|
| 1 | Implemented | Auth.js session and account ownership baseline. | Architecture, testing, failure cases, deployment. |
| 2 | Planned | Pasted text source creation with account-scoped storage. | Business problem, testing, monitoring, cost model. |
| 3 | Planned | Source chunking and PostgreSQL/pgvector embeddings. | Architecture diagrams, eval strategy, tradeoffs, cost model. |
| 4 | Planned | Grounded tutor question flow with citations. | Evals, failure cases, monitoring, README status. |
| 5 | Planned | Flashcard generation with card versions and citations. | Testing, eval strategy, cost model, product narrative. |
| 6 | Planned | Study review workflow for cards and decks. | Business success criteria, monitoring, roadmap. |
| 7 | Planned | Deterministic eval smoke checks for retrieval and citation behavior. | Eval strategy, testing, README. |
| 8 | Planned | Langfuse trace references and privacy-safe telemetry. | Monitoring, failure cases, deployment. |

## Engineering Improvements

- Keep prompt versions as first-class artifacts and update evals with prompt changes.
- Add narrow integration tests around account-scoped repositories before broad UI tests.
- Keep route handlers thin and product behavior inside `apps/web/server`.
- Add cost and token measurement when provider calls are introduced.
- Add Playwright coverage only after workflows have stable UI states.
- Expand docs only when implementation evidence changes.

## Explicitly Deferred Work

Deferred work requires an ADR or later roadmap prompt before implementation:

- Uploaded file ingestion, PDF parsing, OCR, and document loaders.
- Separate NestJS, Express, FastAPI, or Python runtime services.
- Redis queues and independent background workers.
- Kubernetes, Terraform, multi-region deployment, and autoscaling.
- Dedicated vector database migration.
- Local ML models, PyTorch ranking, or custom embeddings.
- Provider abstraction and model routing across multiple vendors.
- Enterprise administration, classroom management, and institutional analytics.
- Mobile apps and browser extensions.

## Human Review Points

Human review is required when future work changes:

- Architecture ownership or runtime boundaries.
- Auth/account semantics.
- Storage, vector search, or migrations.
- Provider strategy, model behavior, or pricing assumptions.
- Privacy posture for prompts, traces, evals, logs, screenshots, or reports.
- Deployment scope or production hardening.

## Portfolio Evidence Rule

Every future feature should update the relevant evidence docs when it changes public claims:

- Business problem and product promise.
- System architecture and diagrams.
- Engineering tradeoffs.
- Testing strategy.
- Eval strategy.
- Failure cases.
- Monitoring.
- Deployment.
- Cost model.
- Roadmap and deferred scope.
