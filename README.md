# Ancora

Ancora is a full-stack TypeScript AI product portfolio project for turning private learning sources into grounded study material. The repo is designed to show both implementation and engineering judgment: product problem, architecture decisions, privacy posture, tradeoffs, tests, evals, monitoring, deployment assumptions, cost model, and roadmap.

## Current Status

| Status | Scope |
|---|---|
| Implemented | TypeScript-first monorepo scaffold, ADRs, repo governance, command surface, local Docker Compose foundation, portfolio evidence docs, Auth.js credentials auth, account ownership, and Drizzle/PostgreSQL schema migrations. |
| In progress | Next.js app boundary, shared packages, TypeScript eval runner boundary, prompts/evals artifacts, and operational documentation. |
| Planned | Pasted source ingestion, PostgreSQL/pgvector retrieval behavior, grounded tutor answers, flashcard generation, review flows, Langfuse traces, and deterministic eval smoke checks. |
| Deferred | Uploaded file ingestion, separate backend services, Python runtime services, Redis, Kubernetes, Terraform, PyTorch, dedicated vector DBs, and enterprise scope. |

## Start Here

1. Install workspace dependencies:

   ```bash
   pnpm install
   ```

2. Inspect the current guard lanes:

   ```bash
   pnpm repo:test:fast -- --describe
   pnpm repo:test:task -- --describe
   ```

3. Run the narrow scaffold checks:

   ```bash
   pnpm lint
   pnpm test
   docker compose -f docker/docker-compose.yml config
   ```

4. Start local services as needed:

   ```bash
   make docker-up
   make db-migrate
   make dev
   ```

## Portfolio Evidence

- [Business problem](docs/product/business-problem.md): learner pain, target user, promise, non-goals, and success criteria.
- [System overview](docs/architecture/system-overview.md): TypeScript-first architecture, boundaries, data flow, and privacy model.
- [Architecture diagrams](docs/architecture/diagrams.md): current/planned system, RAG, eval, and observability flows.
- [Engineering tradeoffs](docs/engineering/tradeoffs.md): runtime, RAG, workflow, storage, auth, and local platform decisions.
- [Testing strategy](docs/testing/testing-strategy.md): unit, integration, API/server, UI, Playwright, account isolation, privacy, and failure-path expectations.
- [Eval strategy](docs/evals/eval-strategy.md): deterministic smoke evals, report-only quality evals, citation checks, RAG comparisons, grading, and artifact sanitation.
- [Failure cases](docs/ops/failure-cases.md): retrieval, citation, prompt injection, provider, auth, account, model output, cost, and trace privacy risks.
- [Monitoring](docs/ops/monitoring.md): planned Langfuse, OpenTelemetry, Grafana/Prometheus, product metrics, latency, cost, and privacy boundaries.
- [Deployment](docs/ops/deployment.md): planned topology, environment variables, migrations, secrets, rollback, and deferred hardening.
- [Cost model](docs/ops/cost-model.md): estimation framework for ingestion, tutor questions, flashcards, study sessions, and demo/monthly usage.
- [Next improvements](docs/roadmap/next-improvements.md): planned slices, explicit deferred work, and docs that future features should update.

## Repo Map

- `apps/web`: Next.js/Node/TypeScript client UI, product API, auth, and AI runtime boundary.
- `apps/web/server`: server-side product, auth/account, database, and AI runtime code; route handlers should stay thin.
- `apps/web/drizzle`: Drizzle migrations for Auth.js, account ownership, source/chunk foundations, and trace references.
- `tools/eval-runner`: internal TypeScript eval CLI boundary for synthetic smoke checks and future eval suites.
- `packages`: shared UI, typed contracts, schemas, and config.
- `prompts`: versioned prompt artifact area.
- `evals`: synthetic datasets, rubrics, fixtures, and reports.
- `docker`: local Docker Compose foundation.
- `scripts/ci/lanes`: canonical validation entry points.
- `docs`: canonical product, architecture, engineering, testing, eval, operations, roadmap, and agent guidance.

## Conventions

- Architecture decisions: `docs/adr/`.
- Documentation governance: `docs/engineering/documentation-governance.md`.
- Git and PR titles: `docs/engineering/git-conventions.md`.
- Next.js structure: `docs/frontend/nextjs-feature-first-convention.md`.
- Next.js naming: `docs/frontend/nextjs-naming-convention.md`.
- Monorepo boundaries: `docs/engineering/monorepo-conventions.md`.

Private source material must stay out of fixtures, eval data, screenshots, logs, docs, and commits. Use IDs and trace references when full source text is not required.
