# Ancora

Ancora is an AI-native learning platform for turning private learning sources into grounded study material. The repo is intentionally scaffolded as a TypeScript-first monorepo: the browser UI, product API, and AI runtime belong in `apps/web`, and eval execution belongs in an internal TypeScript tool boundary.

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
   make dev
   ```

## Repo Map

- `apps/web`: Next.js/Node/TypeScript client UI, product API, and AI runtime boundary.
- `apps/web/server`: server-side product and AI runtime code; route handlers should stay thin.
- `tools/eval-runner`: internal TypeScript eval CLI boundary for synthetic smoke checks and future eval suites.
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
