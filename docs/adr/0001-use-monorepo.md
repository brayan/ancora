# 0001: Use a Monorepo

## Status

Accepted

## Context

Ancora combines a Next.js client, a FastAPI AI/product API, workers, prompt artifacts, evals, observability configuration, and documentation. The project needs clear boundaries while keeping prompts, schemas, evals, and product code easy to evolve together.

## Decision

Use a single monorepo for v1. The initial repo areas are `apps/web`, `services/ai-runtime`, `services/workers`, `services/eval-runner`, `packages`, `prompts`, `evals`, `infra`, `docs`, and `scripts`.

## Alternatives Considered

- Multiple repositories for frontend, backend, prompts, evals, and infra.
- A single flat application repository without explicit shard boundaries.

## Consequences

- Cross-cutting changes can update product code, prompts, evals, and docs in one review.
- Shared schemas and contracts can be kept close to their consumers.
- Agent routing needs to be explicit, so `docs/agents/repo-manifest.yaml` defines ownership and boundaries.
- CI must eventually avoid running every expensive check for every small change.
