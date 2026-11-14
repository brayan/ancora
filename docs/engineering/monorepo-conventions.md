# Monorepo Conventions

ADR 0011 defines the local programming-practice product. `apps/web` owns the Next.js UI/product API and PostgreSQL/Drizzle persistence. `apps/practice-service` owns bounded FastAPI/Pydantic AI generation, with no independent database/migration ownership. Optional coaching remains deferred. Create directories only for implemented slices.

Keep App Router files thin and feature UI under `features/programming-practice`. Follow docs/frontend naming/import rules; no web src/ layer or empty architecture scaffolds. Static execution delivery belongs to `apps/web/runner`, on a separate origin from the product UI. Generated Python never runs on the host/server.

Shared packages stay thin. `prompts` holds versioned instructions, `evals` synthetic datasets/rubrics, and `tools/eval-runner` offline/CI evidence. The runner is distinct from the eval CLI. Provider credentials stay in server environments. Never add private source/code to artifacts.

PostgreSQL remains the durable store; existing SQL/snapshots are history, not the current practice model. Reviewed custom migrations 0006 and 0007 add practice and generation records through the existing Drizzle ledger. Application startup never migrates automatically. Schema-diff generation and account seeding remain unavailable; see docs/architecture/practice-persistence.md and docs/architecture/challenge-generation.md. No Redis, queues, uploaded files, Kubernetes, Terraform or general-purpose Python backend.
