# System Overview

## Status Summary

| Status | Scope |
|---|---|
| Implemented | TypeScript-first monorepo scaffold, ADRs, command surface, docs governance, and project routing metadata. |
| In progress | Public architecture narrative and evidence docs. |
| Planned | Account-aware Next.js product APIs, AI runtime orchestration, Drizzle models, pgvector retrieval, Auth.js, OpenAI calls, eval hooks, and Langfuse trace references. |
| Deferred | Separate backend microservices, Python runtime services, Redis queues, Kubernetes, Terraform, PyTorch, and uploaded file ingestion. |

## Runtime Ownership

Ancora v1 is owned by a single TypeScript-first product boundary: `apps/web`.

`apps/web` owns:

- Browser UI for source, deck, card, review, quiz, and tutor workflows.
- Thin `app/api/**/route.ts` handlers for HTTP entry points.
- Server-side product orchestration under `apps/web/server`.
- Server-side AI runtime orchestration under `apps/web/server`.
- Account-aware access control around private source material.
- Provider calls to OpenAI through server-side service boundaries.
- Drizzle access to PostgreSQL and pgvector.
- Prompt versions, trace references, and eval hook integration.

Browser code must not call PostgreSQL, pgvector, OpenAI, Langfuse secrets, or private provider credentials directly.

## Why Next.js Owns v1 Product and AI Runtime

ADR 0009 makes Next.js/Node/TypeScript the v1 product and AI runtime owner to keep the first vertical slice cohesive. Ancora's near-term risk is not service decomposition; it is proving a useful, grounded, observable learning loop. Keeping the browser, product API, and AI runtime in one TypeScript repo boundary reduces coordination cost while the product model is still forming.

This decision also keeps shared schemas, prompt artifacts, evals, and trace references close to the product code that uses them. A later separate service can be added only if an ADR shows that the extra deployment boundary improves reliability, scale, privacy, or team ownership enough to justify the complexity.

## Major Boundaries

| Boundary | Status | Responsibility |
|---|---|---|
| `apps/web` | In progress | Next.js UI, product API, and server-side AI runtime. |
| `apps/web/server` | Planned | Account-aware product logic, retrieval, prompt execution, provider calls, trace references, and workflow orchestration. |
| `tools/eval-runner` | In progress | Internal TypeScript CLI for synthetic smoke evals and future report-only quality evals. |
| `packages/ui` | In progress | Shared React UI building blocks without product data access. |
| `packages/shared-types` | In progress | Shared TypeScript contracts. |
| `packages/schemas` | In progress | Shared schemas for typed boundaries, prompts, evals, and product artifacts. |
| `prompts` | In progress | Versioned prompt artifacts and prompt metadata. |
| `evals` | In progress | Synthetic datasets, rubrics, fixtures, and reports. |
| `docker` | In progress | Local PostgreSQL/pgvector foundation through Docker Compose. |
| `infra/observability` | In progress | Observability configuration placeholders, not production infrastructure. |

## Planned Data Flow

1. A signed-in user works inside an account boundary.
2. The user creates a source from pasted text.
3. The server stores source metadata and source chunks in PostgreSQL.
4. The server generates embeddings and stores vectors with pgvector.
5. Tutor, flashcard, quiz, and review workflows retrieve account-scoped chunks.
6. The AI runtime builds prompts from source IDs, chunk IDs, prompt versions, and product context.
7. OpenAI receives only the content needed for the requested workflow, with product behavior making provider use explicit.
8. The server stores generated artifacts, citations, eval metadata, and trace references.
9. Privacy-safe monitoring records latency, token counts, cost estimates, failures, prompt versions, and IDs instead of raw private source text.

## Privacy Boundary

The account is the privacy and ownership boundary. Source material, source chunks, decks, cards, reviews, eval runs, and trace references belong to an account where applicable. Product logs, docs, fixtures, eval datasets, screenshots, and observability records must use IDs and trace references unless full text is explicitly required and approved.

## Deferred Architecture

The following are intentionally deferred until the core vertical slice works and an ADR changes scope:

- Separate NestJS or Express API services.
- Python request-serving services or workers.
- Redis or external job queues.
- Kubernetes or Terraform.
- Dedicated vector databases.
- Uploaded file ingestion, OCR, and PDF parsing.
- PyTorch-based local ML workflows.
