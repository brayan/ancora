# Ancora Web

## Start Here

This module is the Next.js/Node/TypeScript owner for Ancora's v1 client UI, product API, and AI runtime.

Server-side product and AI code belongs under `apps/web/server` with thin `app/api/**/route.ts` handlers. Browser code must not access PostgreSQL, pgvector, OpenAI, Langfuse secrets, or private provider credentials directly.

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
