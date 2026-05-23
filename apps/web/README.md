# Ancora Web

## Start Here

This module is the Next.js TypeScript client UI. It may support UI delivery and frontend ergonomics, but it must call `services/ai-runtime` for product API behavior and must not access PostgreSQL, pgvector, or OpenAI directly.

Useful commands:

```bash
pnpm --filter @ancora/web dev
pnpm --filter @ancora/web lint
pnpm --filter @ancora/web lint:naming
pnpm --filter @ancora/web typecheck
pnpm --filter @ancora/web test
```

This app follows the Ancora Next.js conventions in:

- `docs/frontend/nextjs-feature-first-convention.md`
- `docs/frontend/nextjs-naming-convention.md`
