# System Overview

ADR 0011 replaces the earlier source-grounded flashcard architecture with local Python programming practice.

| Boundary | Owner and status |
|---|---|
| apps/web | Next.js App Router/React/TypeScript UI, browser product boundary and future durable orchestration. |
| apps/web/runner | Dedicated-origin static browser execution broker and disposable Pyodide worker; synthetic spike. |
| apps/practice-service | Planned FastAPI/Pydantic AI generator/optional coach. No DB writes. |
| apps/web/server/db | Reserved PostgreSQL/Drizzle persistence owner. No active models or DB calls in the spike. Historical SQL/snapshots retained. |
| packages/ui, shared-types, schemas, config | Thin shared UI/contracts/configuration; no hidden product workflows. |
| prompts, evals, tools/eval-runner | First-class versioned synthetic evidence. The existing CLI smoke is only a scaffold. |

No auth, accounts, sources, decks/cards, RAG or embeddings are current product capabilities. No service/worker on the host executes generated Python. Browser results are untrusted and cannot authorize paid calls. See docs/architecture/runner-spike.md, docs/product/programming-practice.md and docs/exec-plans/programming-practice.md.

Local-only deployment is the supported scope. Credentials remain server-side and the runner serves read-only allowlisted assets without app capabilities. Public hosting requires a new review. Existing database contents and migration history are not reset during this pivot.
