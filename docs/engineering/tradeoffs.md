# Engineering Tradeoffs

## Status Summary

| Status | Scope |
|---|---|
| Implemented | ADRs define monorepo, TypeScript-first runtime ownership, OpenAI default provider, Auth/account scope, PostgreSQL/pgvector, and deferred platforms. |
| In progress | Scaffold and docs keep tradeoffs visible before feature work deepens. |
| Planned | Revisit tradeoffs with tests, evals, cost reports, operational incidents, and user feedback. |
| Deferred | Provider abstraction, separate runtimes, queue infrastructure, dedicated vector DBs, and production platform automation. |

## TypeScript-First vs Python Runtime

Ancora originally considered a Python FastAPI runtime, but ADR 0009 and ADR 0010 realign v1 around Next.js/Node/TypeScript.

| Option | Benefit | Cost | Decision |
|---|---|---|---|
| TypeScript-first Next.js runtime | One language across UI, product API, AI runtime, schemas, prompts, and eval hooks. | Less direct access to some Python-first ML tooling. | Accepted for v1. |
| Python runtime service | Strong AI research ecosystem and mature data tooling. | Adds service boundary, deployment surface, contract drift, and privacy coordination. | Deferred to later research/tooling ADR. |

The v1 product risk is proving a grounded learning loop, not proving multi-runtime orchestration.

## Direct RAG Before LangChain Abstractions

The first retrieval workflow should be understandable and testable before higher-level abstractions hide behavior.

| Status | Direction |
|---|---|
| Planned | Start with direct chunking, embedding, vector search, prompt assembly, citation checks, and deterministic tests. |
| Planned | Introduce LangChain.js where it removes repeated retrieval or model orchestration code without hiding account scoping or citations. |
| Deferred | Complex chains, agentic retrieval, and broad provider routing wait until simple RAG behavior has eval evidence. |

## LangGraph Only for Bounded Study Workflows

LangGraph.js is useful when a workflow has explicit states, retries, and transitions. Ancora should use it for bounded study flows such as generate, critique, revise, and persist card versions only after simpler server orchestration is clear.

| Status | Direction |
|---|---|
| Planned | Use regular TypeScript functions for simple single-step tutor or generation paths. |
| Planned | Use LangGraph.js for bounded multi-step study workflows with clear state and failure handling. |
| Deferred | Open-ended autonomous agents that can browse, mutate broad product data, or act outside account-scoped workflows. |

## PostgreSQL/pgvector Before a Separate Vector DB

PostgreSQL with pgvector keeps product data, account ownership, source chunk metadata, and vectors in one durable store.

| Benefit | Tradeoff |
|---|---|
| Simpler local development and fewer moving parts. | May require tuning or replacement when vector scale and latency outgrow pgvector. |
| Easier account-scoped joins and transactional writes. | Retrieval-specific features may lag a dedicated vector database. |
| One migration and backup story for early v1. | A future split will need migration and dual-write planning. |

The separate vector database decision is deferred until evals or operational metrics show pgvector is the bottleneck.

## Auth.js and Drizzle

Auth.js fits the Next.js-first runtime and makes account ownership part of the product boundary from the start. Drizzle gives typed SQL access without hiding database behavior behind a heavy ORM layer.

| Choice | Benefit | Risk to Manage |
|---|---|---|
| Auth.js | Integrates with the Next.js app boundary and supports v1 account ownership. | Tests must prove account isolation and callback/session behavior. |
| Drizzle | Keeps SQL shape visible and type-checked. | Migrations and schema changes need disciplined review. |

## Local-First Docker Compose

Docker Compose is the accepted v1 local platform for PostgreSQL and pgvector.

| Status | Direction |
|---|---|
| In progress | Local Docker Compose configuration supports development and command validation. |
| Planned | Keep local services close to production assumptions without adding platform automation. |
| Deferred | Kubernetes, Terraform, managed queue infrastructure, and production-grade autoscaling. |

Local-first infrastructure keeps the portfolio reviewable. Production hardening belongs in later deployment work after the vertical slice exists.
