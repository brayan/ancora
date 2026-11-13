# Monorepo Conventions

ADR 0011 defines the local programming-practice product. `apps/web` owns the Next.js UI/product API and PostgreSQL/Drizzle persistence. `apps/practice-service` is the planned bounded FastAPI/Pydantic AI generator/coach, with no independent database/migration ownership. Create directories only for implemented slices.

Keep App Router files thin and feature UI under `features/programming-practice`. Follow docs/frontend naming/import rules; no web src/ layer or empty architecture scaffolds. Static execution delivery belongs to `apps/web/runner`, on a separate origin from the product UI. Generated Python never runs on the host/server.

Shared packages stay thin. `prompts` holds versioned instructions, `evals` synthetic datasets/rubrics, and `tools/eval-runner` offline/CI evidence. The runner is distinct from the eval CLI. Provider credentials stay in server environments. Never add private source/code to artifacts.

PostgreSQL remains the durable store; existing SQL/snapshots are history, not the current practice model. Migration generation/application and account seeding are paused pending the persistence slice. No Redis, queues, uploaded files, Kubernetes, Terraform or general-purpose Python backend.
