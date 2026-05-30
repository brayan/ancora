# Ancora Web

## Start Here

This module is the Next.js/Node/TypeScript owner for Ancora's v1 client UI, product API, and AI runtime.

Server-side product and AI code belongs under `apps/web/server` with thin `app/api/**/route.ts` handlers. Browser code must not access PostgreSQL, pgvector, OpenAI, Langfuse secrets, or private provider credentials directly.

Implemented foundations:

- Auth.js local credentials flow for development.
- Account ownership through `accounts`, `users`, and `account_memberships`.
- Drizzle schema and migrations for Auth.js tables, sources, source chunks with pgvector, and LLM trace references.
- Fail-closed account scope helpers under `server/accounts`.

Useful commands:

```bash
pnpm --filter @ancora/web dev
pnpm --filter @ancora/web db:generate
pnpm --filter @ancora/web db:migrate
pnpm --filter @ancora/web lint
pnpm --filter @ancora/web lint:naming
pnpm --filter @ancora/web typecheck
pnpm --filter @ancora/web test
```

Local auth/database setup uses:

- `DATABASE_URL` for PostgreSQL with pgvector.
- `AUTH_SECRET` for Auth.js signing.
- `AUTH_URL` for the local app URL, usually `http://localhost:3000`.

The credentials provider uses JWT sessions because Auth.js does not persist credentials sessions through the adapter. Auth.js provider/session tables are still part of the migration for provider-ready auth paths.

This app follows the Ancora Next.js conventions in:

- `docs/frontend/nextjs-feature-first-convention.md`
- `docs/frontend/nextjs-naming-convention.md`
