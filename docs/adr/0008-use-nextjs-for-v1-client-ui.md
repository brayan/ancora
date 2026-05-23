# 0008: Use Next.js for the v1 Client UI

## Status

Superseded by [0009: Next.js and TypeScript Own the v1 Product and AI Runtime](0009-nextjs-typescript-owns-v1-product-and-ai-runtime.md).

## Supersession Note

This ADR remains useful as history for choosing Next.js and TypeScript. ADR 0009 expands the boundary from client UI to full-stack v1 ownership.

## Context

Ancora needs a browser-based product experience for account-aware source management, grounded tutor workflows, deck creation, flashcard review, quizzes, and observability-facing product dashboards. The original plan paired the UI with a separate Python backend; ADR 0009 supersedes that split.

## Decision

Use Next.js with TypeScript in `apps/web` for the v1 client UI. ADR 0009 now makes this same app the v1 product API and AI runtime owner.

## Alternatives Considered

- A Python-rendered web UI served directly by FastAPI.
- A standalone SPA without Next.js.
- Next.js API routes and server code owning product behavior.

## Consequences

- The v1 user experience can be built with a mature React framework while product and AI runtime behavior stay in TypeScript.
- Browser code must not directly access PostgreSQL, pgvector, OpenAI, or private provider credentials.
- Shared types and schemas should be explicit where web UI, server code, prompts, and evals interact.
- A future mobile or admin app can be added under `apps` without changing the v1 API ownership model.
