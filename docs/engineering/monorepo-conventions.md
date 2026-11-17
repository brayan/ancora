# Monorepo Conventions

ADR 0018 places `web/` and `backend/` directly at repository root, with operation use cases in the Python application layer and intent-specific domain validators. ADR 0011 defines the local programming-practice product. `web` owns the Next.js UI/product API and PostgreSQL/Drizzle persistence. `backend` owns bounded FastAPI/Pydantic AI generation, hints and explicitly requested coaching, with no independent database/migration ownership. Create directories only for implemented slices.

Keep App Router files thin and feature UI under `features/programming-practice`. Follow docs/frontend naming/import rules; no web src/ layer or empty architecture scaffolds. Static execution delivery belongs to `web/runner`, on a separate origin from the product UI. Generated Python never runs on the host/server.

Shared packages stay thin. `prompts` holds versioned instructions, `evals` synthetic datasets/rubrics, and `tools/eval-runner` offline/CI evidence. The runner is distinct from the eval CLI. Provider credentials stay in server environments. Never add private source/code to artifacts.

PostgreSQL remains the durable store; existing SQL/snapshots are history, not the current practice model. Reviewed custom migrations 0006–0010 add practice, generation, solution-reveal, hint and coaching records through the existing Drizzle ledger. Application startup never migrates automatically. Schema-diff generation and account seeding remain unavailable; see [migration ownership](../architecture/practice-persistence.md). No Redis, queues, uploaded files, Kubernetes, Terraform or general-purpose Python backend.
