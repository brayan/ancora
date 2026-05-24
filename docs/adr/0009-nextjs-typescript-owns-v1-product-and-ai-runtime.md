# 0009: Next.js and TypeScript Own the v1 Product and AI Runtime

## Status

Accepted

## Context

Ancora's updated portfolio strategy is TypeScript-first. The first vertical slice should demonstrate a coherent full-stack AI product with one primary runtime boundary instead of splitting product behavior across a web app and a separate backend service before the product loop exists.

The v1 stack should use Next.js, Node.js, TypeScript, Vercel AI SDK, OpenAI SDK, Drizzle, PostgreSQL with pgvector, Auth.js, Langfuse JS/TS, LangChain.js, and LangGraph.js. These integrations are implementation scope for later prompts; this ADR defines ownership only.

## Decision

`apps/web` owns the v1 browser UI, product API, and AI runtime. Server-side product and AI code belongs under `apps/web/server` with thin `app/api/**/route.ts` handlers where HTTP routes are needed.

The browser must not call PostgreSQL, pgvector, OpenAI, Langfuse secrets, or other private provider credentials directly. Those calls belong in the server boundary with account-aware authorization, privacy controls, prompt/version visibility, eval hooks, and trace references.

No separate backend service owns v1 product API or AI runtime behavior unless a later ADR changes that boundary.

## Alternatives Considered

- Keep the prior Python service split.
- Add a separate NestJS or Express service for the product API.
- Use Next.js only for UI and defer product behavior to later.

## Consequences

- Future agents route auth, RAG, provider integration, Drizzle models, prompt execution, LangChain.js, LangGraph.js, Langfuse, and product API work through `apps/web/server`.
- Shared schemas, prompt artifacts, evals, and trace references stay explicit repo artifacts rather than hidden inside route handlers.
- The root command surface can stay pnpm-first and TypeScript-first.
- A later separate service requires an ADR that explains why the extra boundary is worth the coordination and privacy cost.
