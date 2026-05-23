# 0008: Use Next.js for the v1 Client UI

## Status

Accepted

## Context

Ancora needs a browser-based product experience for account-aware source management, grounded tutor workflows, deck creation, flashcard review, quizzes, and observability-facing product dashboards. The UI should integrate cleanly with a Python FastAPI backend without taking ownership of product API behavior.

## Decision

Use Next.js with TypeScript in `apps/web` for the v1 client UI. The web app will call `services/ai-runtime` over typed API contracts. Next.js server functionality may support UI delivery and frontend ergonomics, but it must not become a separate v1 product API owner.

## Alternatives Considered

- A Python-rendered web UI served directly by FastAPI.
- A standalone SPA without Next.js.
- Next.js API routes owning product behavior.

## Consequences

- The v1 user experience can be built with a mature React framework while AI and product API behavior stay in FastAPI.
- The web boundary must respect account-aware API contracts and must not directly access PostgreSQL, pgvector, or OpenAI.
- Shared types and schemas should be explicit where the web app and FastAPI interact.
- A future mobile or admin app can be added under `apps` without changing the v1 API ownership model.
