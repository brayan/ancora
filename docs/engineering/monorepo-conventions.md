# Monorepo Conventions

Ancora is a planned monorepo. The initial governance model defines boundaries before implementation code exists.

## Planned Boundaries

```txt
ancora/
  apps/
    web/
  services/
    ai-runtime/
    workers/
  tools/
    eval-runner/
  packages/
    ui/
    shared-types/
    schemas/
    config/
  prompts/
  evals/
  config/
  docker/
  infra/
    observability/
  docs/
  scripts/
  .github/
    workflows/
```

## Ownership

`apps/web` is the Next.js client UI. It calls FastAPI and does not own product API behavior, database access, or provider calls.

`services/ai-runtime` is the FastAPI boundary for the v1 product API and AI API. It owns account-aware product behavior, RAG, generation, grading, retrieval, provider calls, prompt execution, and trace metadata.

`services/workers` is for Python background work after the synchronous core slice is proven. Redis and uploaded file ingestion remain deferred until an ADR changes that scope.

`tools/eval-runner` is for offline and CI-oriented eval execution. It is an internal CLI and artifact boundary, not a deployable service.

`prompts` stores versioned prompts, rubrics, schemas, and prompt metadata. Prompts are product artifacts, not incidental strings hidden in code.

`evals` stores synthetic datasets, rubrics, fixtures, and reports. It must not contain private source material.

`docker` starts with local PostgreSQL and pgvector configuration for the accepted v1 stack.

`infra` holds observability configuration placeholders. Kubernetes and Terraform are deferred.

`scripts` and `.github/workflows` provide repeatable developer and CI entry points.

## Boundary Rules

- Prefer small vertical slices that touch the minimum number of boundaries.
- Keep shared packages thin. Do not hide business logic in shared utilities when it belongs to FastAPI or the web app.
- Make contracts explicit through schemas and typed clients when app and service boundaries interact.
- Keep account ownership visible in data models, API contracts, tests, and eval metadata.
- Keep OpenAI provider calls behind service boundaries so later provider changes do not alter product concepts.
- Follow `docs/frontend/nextjs-feature-first-convention.md` and `docs/frontend/nextjs-naming-convention.md` for `apps/web` and shared React UI work.

## Command Surface

Implementation should converge on:

```bash
make dev
make test
make lint
make eval-smoke
make db-migrate
make db-seed
make docker-up
make docker-down
```

Until these commands exist, agents should inspect available scripts and report gaps.

## Deferred Scope

Do not add a standalone Node API, Kubernetes, Terraform, Redis, PyTorch, or uploaded file ingestion until the core vertical slice works and an ADR approves the change.
