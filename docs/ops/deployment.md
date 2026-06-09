# Deployment

## Status Summary

| Status | Scope |
|---|---|
| Implemented | Local command surface, Docker Compose foundation, Drizzle migration tooling, Auth.js environment examples, deferred infrastructure ADRs, and docs governance. |
| In progress | Deployment narrative defines the intended topology without adding production automation. |
| Planned | Production Next.js deployment, managed PostgreSQL/pgvector operations, OpenAI provider secrets, Langfuse configuration, rollback drills, and environment hardening. |
| Deferred | Kubernetes, Terraform, multi-region production, separate services, Redis, and managed queue infrastructure. |

## Planned Topology

The v1 deployment target is a single Next.js application boundary backed by PostgreSQL with pgvector.

| Component | Status | Deployment Role |
|---|---|---|
| `apps/web` | In progress | Browser UI, Auth.js routes, product API routes, and server-side AI runtime. |
| PostgreSQL/pgvector | Implemented locally | Durable auth/account records, source/chunk foundations, embeddings column, and trace reference table. Retrieval behavior remains planned. |
| OpenAI | Planned | Default LLM and embedding provider. |
| Auth.js | Implemented foundation | Local credentials auth, account ownership, JWT credentials sessions, and provider-ready Auth.js tables. |
| Langfuse | Planned | LLM trace and eval metadata references. |
| `tools/eval-runner` | In progress | Internal CLI for local/CI eval execution, not a deployed service. |

## Environment Variables

Environment variables should be documented through `.env.example` files only. Real secrets must stay outside the repo.

Required or planned categories:

- `DATABASE_URL` for PostgreSQL with pgvector.
- `AUTH_SECRET` for Auth.js signing. Generate a real secret outside the repo for any shared or deployed environment.
- `AUTH_URL` for the application base URL when the deployment platform does not infer it.
- OpenAI API key and model configuration.
- Langfuse public/secret keys and host.
- Cost, token, or workflow guardrail settings.

Do not commit real `.env` files, API keys, trace exports, or provider payloads.

## Database Migrations

Drizzle migrations are implemented for the auth/account foundation. Migration handling should include:

- Local migration command documentation: `make db-migrate` or `pnpm --filter @ancora/web db:migrate`.
- Review of account ownership columns and indexes.
- pgvector extension setup.
- Rollback notes for risky schema changes.
- Synthetic seed data only.

The initial migration creates `CREATE EXTENSION IF NOT EXISTS vector`, Auth.js tables, `accounts`, `users`, `account_memberships`, `sources`, `source_chunks`, and `llm_trace_refs`. Credentials sessions use JWTs due to Auth.js provider constraints; `auth_sessions` is still present for future provider-backed sessions.

## Secrets

Secrets must be injected through environment variables or the deployment platform's secret manager. Docs and examples may show variable names, but not real values.

Secret-sensitive changes require human review when they alter provider behavior, auth/account scope, privacy posture, or deployment scope.

For local development only, the web server has non-production fallbacks for `DATABASE_URL` and `AUTH_SECRET`. Deployed environments must set real values explicitly.

## Rollback

Planned rollback guidance:

- Keep generated artifacts versioned so failed regeneration does not overwrite accepted card content.
- Separate reversible UI changes from irreversible data migrations.
- Document migration rollback or forward-fix strategy before running production migrations.
- Preserve prompt versions so model and prompt regressions can be traced.
- Keep eval reports tied to prompt versions and model settings.

## Deferred Production Hardening

The following are deferred until the core vertical slice exists and an ADR or roadmap item justifies the work:

- Kubernetes and Terraform.
- Separate backend services.
- Redis queues and background worker infrastructure.
- Multi-region failover.
- Production incident automation and paging.
- Enterprise retention, audit, and compliance controls.
