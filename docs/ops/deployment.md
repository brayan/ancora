# Deployment

## Status Summary

| Status | Scope |
|---|---|
| Implemented | Local command surface, Docker Compose foundation, deferred infrastructure ADRs, and docs governance. |
| In progress | Deployment narrative defines the intended topology without adding automation. |
| Planned | Next.js app deployment, PostgreSQL/pgvector database, Auth.js configuration, OpenAI provider secrets, Langfuse configuration, migrations, rollback notes, and environment documentation. |
| Deferred | Kubernetes, Terraform, multi-region production, separate services, Redis, and managed queue infrastructure. |

## Planned Topology

The v1 deployment target is a single Next.js application boundary backed by PostgreSQL with pgvector.

| Component | Status | Deployment Role |
|---|---|---|
| `apps/web` | Planned | Browser UI, product API routes, and server-side AI runtime. |
| PostgreSQL/pgvector | Planned | Durable product records, account boundaries, source chunks, embeddings, and vector search. |
| OpenAI | Planned | Default LLM and embedding provider. |
| Auth.js | Planned | Authentication and account/session ownership. |
| Langfuse | Planned | LLM trace and eval metadata references. |
| `tools/eval-runner` | In progress | Internal CLI for local/CI eval execution, not a deployed service. |

## Environment Variables

Environment variables should be documented through `.env.example` files only. Real secrets must stay outside the repo.

Planned categories:

- Database URL and migration configuration.
- Auth.js secret and provider configuration.
- OpenAI API key and model configuration.
- Langfuse public/secret keys and host.
- Application base URL.
- Cost, token, or workflow guardrail settings.

Do not commit real `.env` files, API keys, trace exports, or provider payloads.

## Database Migrations

Drizzle migrations are planned for product schema changes. Migration handling should include:

- Local migration command documentation.
- Review of account ownership columns and indexes.
- pgvector extension setup.
- Rollback notes for risky schema changes.
- Synthetic seed data only.

## Secrets

Secrets must be injected through environment variables or the deployment platform's secret manager. Docs and examples may show variable names, but not real values.

Secret-sensitive changes require human review when they alter provider behavior, auth/account scope, privacy posture, or deployment scope.

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
