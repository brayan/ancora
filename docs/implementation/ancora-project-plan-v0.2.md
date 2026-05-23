# Ancora Project Plan

**Project:** Ancora  
**Positioning:** AI-native learning platform  
**Status:** TypeScript-first implementation planning  
**Date:** 2026-05-23

## Governance Note

This plan is retained as implementation context. Current repo governance is defined by `AGENTS.md`, `docs/agents/repo-manifest.yaml`, the project shards, and accepted ADRs.

The v1 runtime decision is now ADR 0009: Next.js/Node/TypeScript owns the product API and AI runtime. ADR 0010 defers Python runtime services and workers to later research/tooling scope.

## Product Thesis

Ancora helps a learner turn private learning sources into grounded flashcards, adaptive quizzes, guided study sessions, and measurable learning progress.

Generated study material must be traceable to source chunks, prompt versions, model settings, eval scores, and trace references without leaking private source material into logs, docs, fixtures, screenshots, commits, or eval datasets.

## v1 Stack

| Layer | Choice |
|---|---|
| Web app, product API, and AI runtime | Next.js + Node.js + TypeScript in `apps/web` |
| Server boundary | `apps/web/server` plus thin `app/api/**/route.ts` handlers |
| AI SDKs | Vercel AI SDK and OpenAI SDK |
| RAG and workflow libraries | LangChain.js and LangGraph.js |
| Database and vector search | Drizzle with PostgreSQL and pgvector |
| Auth | Auth.js with account ownership as the privacy boundary |
| LLM observability | Langfuse JS/TS |
| Eval runner | TypeScript CLI in `tools/eval-runner` |
| Local platform | Docker Compose for PostgreSQL/pgvector |

## Deferred Scope

Do not add separate NestJS or Express microservices, Python runtime services or workers, Kubernetes, Terraform, Redis, PyTorch, uploaded file ingestion, or non-synthetic eval datasets until an ADR approves the change.

Python may return later for research or tooling, but it is not v1 request-serving or worker runtime scope.

## Monorepo Shape

```txt
ancora/
  apps/
    web/
      app/
      server/
  tools/
    eval-runner/
  packages/
    ui/
    shared-types/
    schemas/
    config/
  prompts/
  evals/
  config/
  docker/
  infra/
  docs/
  scripts/
```

## Boundary Responsibilities

`apps/web` owns learner-facing UI, account-aware product APIs, AI runtime orchestration, provider calls, Drizzle access, prompt execution, LangChain.js/LangGraph.js workflows, and Langfuse trace references.

Browser code must not directly access PostgreSQL, pgvector, OpenAI, Langfuse secrets, or private provider credentials. Product behavior belongs in the server boundary, not in shared packages or UI components.

`tools/eval-runner` owns offline and CI-oriented eval execution against synthetic or explicitly approved material. It is not a deployable service.

`prompts` and `evals` remain first-class repo artifacts. Prompts, rubrics, schemas, eval datasets, and reports should stay versioned, inspectable, and privacy-safe.

## Initial Vertical Slice Direction

1. Auth and account ownership.
2. Pasted text source creation.
3. Source chunking and embeddings in PostgreSQL/pgvector.
4. Grounded retrieval for tutor and flashcard generation.
5. Prompt versions, trace references, and Langfuse metadata.
6. Synthetic eval smoke checks for retrieval and generation.
7. Reviewable UI for sources, decks, cards, reviews, quizzes, and tutor flows.

Each slice should stay narrow, update ADRs when ownership or privacy changes, and validate through the smallest meaningful `pnpm` or `make` command surface.

## Canonical Commands

```bash
pnpm web:lint
pnpm web:typecheck
pnpm web:test
pnpm eval:smoke
pnpm repo:test:fast
pnpm repo:test:task
pnpm repo:test:context
pnpm repo:test:pr
docker compose -f docker/docker-compose.yml config
```

The corresponding `make` entry points remain available for the root workflow where defined.
