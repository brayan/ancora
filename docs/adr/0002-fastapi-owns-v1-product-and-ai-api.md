# 0002: FastAPI Owns the v1 Product and AI API

## Status

Superseded by [0009: Next.js and TypeScript Own the v1 Product and AI Runtime](0009-nextjs-typescript-owns-v1-product-and-ai-runtime.md) and [0010: Defer Python Runtime to Later Research and Tooling](0010-defer-python-runtime-to-later-research-and-tooling.md).

## Supersession Note

This ADR is retained as decision history only. It no longer defines v1 ownership. New product API, AI runtime, provider, RAG, LangChain.js, LangGraph.js, Langfuse, auth, and database work routes through the `apps/web` server boundary unless a later ADR changes that scope.

## Context

At the time of this decision, Ancora's first vertical slice depended on RAG, embeddings, prompt execution, answer grading, LangGraph workflows, Langfuse tracing, and eval hooks. The original plan favored Python's AI ecosystem and deferred a separate JavaScript API service until product complexity justified it.

## Decision

`services/ai-runtime` was originally planned as a Python FastAPI service that would own both the v1 product API and AI API. `apps/web` would have called FastAPI over HTTP. This decision has been superseded by ADR 0009.

## Alternatives Considered

- Next.js API routes owning product behavior.
- A standalone Node or NestJS product API plus a separate Python AI service.
- A Python-only app without a separate web client.

## Consequences

- Product and AI workflows can share Python models, retrieval code, tracing, and eval integrations.
- The v1 backend boundary is simpler and easier to observe.
- The web app must use typed API contracts rather than direct database or provider access.
- The TypeScript-first v1 plan replaces this boundary; Python runtime work is deferred by ADR 0010.
