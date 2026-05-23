# Ancora

Ancora is an AI-native learning platform for turning private learning sources into grounded study material. The repo is intentionally scaffolded as a small Python/Next.js monorepo: product API behavior belongs in FastAPI, the browser UI belongs in Next.js, and eval execution belongs in an internal tool boundary.

## Start Here

1. Install workspace dependencies:

   ```bash
   pnpm install
   ```

2. Inspect the current guard lanes:

   ```bash
   scripts/ci/lanes/run-fast-blockers.sh --describe
   scripts/ci/lanes/run-task-guards.sh --describe
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
   make dev
   ```

## Repo Map

- `apps/web`: Next.js TypeScript client UI.
- `services/ai-runtime`: FastAPI v1 product API and AI API boundary.
- `services/workers`: placeholder Python worker boundary for later async jobs.
- `tools/eval-runner`: internal eval CLI boundary for synthetic smoke checks and future eval suites.
- `packages`: shared UI, typed contracts, schemas, and config.
- `prompts`: versioned prompt artifact area.
- `evals`: synthetic datasets, rubrics, fixtures, and reports.
- `docker`: local Docker Compose foundation.
- `scripts/ci/lanes`: canonical validation entry points.

## Conventions

- Git and PR titles: `docs/engineering/git-conventions.md`.
- Next.js structure: `docs/frontend/nextjs-feature-first-convention.md`.
- Next.js naming: `docs/frontend/nextjs-naming-convention.md`.
- Monorepo boundaries: `docs/engineering/monorepo-conventions.md`.

Private source material must stay out of fixtures, eval data, screenshots, logs, docs, and commits. Use IDs and trace references when full source text is not required.
