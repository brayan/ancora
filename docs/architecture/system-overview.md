# System Overview

ADR 0011 replaces the earlier source-grounded flashcard architecture with local Python programming practice.

| Boundary | Owner and status |
|---|---|
| web | Next.js App Router/React/TypeScript UI, browser product boundary and durable practice/generation/assistance orchestration. |
| web/runner | Dedicated-origin static browser execution broker and disposable Pyodide worker; v1 fixed and v2 generated contracts. |
| backend | FastAPI/Pydantic AI generation, progressive hints and selected-attempt coaching. No DB writes. |
| web/server/db | PostgreSQL/Drizzle persistence owner for immutable revisions, versioned drafts and exact attempt/assistance snapshots. Historical SQL/snapshots retained. |
| packages/ui, shared-types, schemas, config | Thin shared UI/contracts/configuration; no hidden product workflows. |
| prompts, evals, tools/eval-runner | First-class versioned synthetic evidence. The existing CLI smoke is only a scaffold. |

No auth, accounts, sources, decks/cards, RAG or embeddings are current product capabilities. No service/worker on the host executes generated Python. Browser results are untrusted and cannot authorize paid calls. See docs/architecture/runner-spike.md, docs/product/programming-practice.md and docs/exec-plans/programming-practice.md.

Local-only deployment is the supported scope. Credentials remain server-side and the runner serves read-only allowlisted assets without app capabilities. Public hosting requires a new review. Existing database contents and migration history are not reset during this pivot.

Fixed practice now persists through the reviewed [PostgreSQL/Drizzle boundary](practice-persistence.md) under [ADR 0012](../adr/0012-persist-fixed-practice-with-additive-migrations.md). Browser execution remains separate from product writes.

[ADR 0013](../adr/0013-bounded-generation-and-automated-checks.md) adds bounded generation, immutable candidates, resumable reference validation and automated checks. See the [generation lifecycle](challenge-generation.md). [Solution reveal](practice-assistance.md) adds explicit, durable assistance without provider calls or draft replacement.

[Progressive hints](progressive-hints.md) adds durable sequential levels and bounded explicit retries under ADR 0015, without sharing learner code or changing execution verdicts.

Selected-attempt coaching follows [ADR 0016](../adr/0016-persist-selected-attempt-coaching.md): explicit saved-source sharing, bounded advisory feedback, Next.js-only persistence and immutable attempt assistance snapshots. See [the boundary/lifecycle](selected-attempt-coaching.md).
