# 0002: FastAPI Owns the v1 Product and AI API

## Status

Accepted

## Context

Ancora's first vertical slice depends on RAG, embeddings, prompt execution, answer grading, LangGraph workflows, Langfuse tracing, and eval hooks. These workflows fit Python's AI ecosystem. The team also wants to defer a standalone Node API until product complexity justifies it.

## Decision

`services/ai-runtime` will be a Python FastAPI service and will own both the v1 product API and AI API. `apps/web` will call FastAPI over HTTP. Next.js server functionality may support UI delivery, but it must not become a separate v1 product API owner.

## Alternatives Considered

- Next.js API routes owning product behavior.
- A standalone Node or NestJS product API plus a separate Python AI service.
- A Python-only app without a separate web client.

## Consequences

- Product and AI workflows can share Python models, retrieval code, tracing, and eval integrations.
- The v1 backend boundary is simpler and easier to observe.
- The web app must use typed API contracts rather than direct database or provider access.
- A Node API remains a later option, but requires a new ADR.
