# Ancora Agent Rules

Ancora is a local, single-user programming-practice application. ADR 0011 and CONTEXT.md own the current direction. Older account/source/flashcard ADRs are decision history.

Use the [engineering-playbook](https://github.com/brayan/engineering-playbook) and its [shared agent workflow](https://github.com/brayan/engineering-playbook/blob/main/docs/agents/shared-agent-workflow.md) as the general Sailtech baseline. Local rules are the specific overlay. An optional sibling checkout is a reading mirror, never a validation dependency.

## Startup and scope

1. Run `git status --short`; preserve unrelated work. A separate worktree does not copy uncommitted edits.
2. Read CONTEXT.md, docs/agents/repo-manifest.yaml, ADR 0011 and only the matching project shard.
3. Keep App Router delivery thin; use the existing feature-first/naming conventions and no new web src/ layer.
4. Build small slices. Do not scaffold empty services or architecture layers. Docs-only tasks must not add executable code, dependencies or migrations.
5. Follow docs/engineering/code-quality-conventions.md: braces for every TS/JS control-flow body, contextual blank-line grouping, and the shared naming/structure rules. Apply task-owned self-review before narrow checks; formatting does not replace paragraph review.

## Architecture

- Next.js App Router, React and TypeScript own UI/product orchestration.
- FastAPI/Pydantic AI own programming generation and optional coaching; the service is planned after the runner spike.
- PostgreSQL/Drizzle remain the single durable-store/migration owner. No Python database writer.
- No authentication, accounts, Sources, decks/cards or RAG in the current product.
- Generated/submitted Python runs only in the isolated browser runner, never in server/host Python.
- Keep versioned prompts, contracts and synthetic evals as explicit artifacts. OpenAI remains the default provider.
- Public deployment, multi-user access, uploaded files, queues, Redis, Kubernetes, Terraform and local-model infrastructure are deferred.

## Privacy and capability boundaries

Submitted code and private learning material must not enter logs, traces, screenshots, fixtures, commits or eval datasets. Use synthetic content and IDs/digests/versions. Treat model output and learner code as untrusted. Credentials stay in environment variables; commit only examples. Make external provider use explicit. Never give the runner credentials or privileged application helpers; messages are bounded data, never actions. No paid calls without the selected model and evaluation budget.

## High-risk scope

Obtain confirmation for architecture/storage/provider/privacy/deployment changes outside an accepted ADR, destructive operations outside the authorized slice, real data/secrets, and new dependencies/migrations/services outside the requested work. Preserve historical migrations and database volumes; do not reset existing databases as part of source cleanup.

## Commands and handoff

Inspect package scripts before use. Current checks: `pnpm code:check`, `pnpm format:check`, `pnpm quality:test`, `pnpm web:lint`, `pnpm web:typecheck`, `pnpm web:test`, `pnpm web:test:browser`, `pnpm packages:typecheck`, `pnpm eval:typecheck`, `pnpm eval:test`, `pnpm eval:smoke`, `pnpm docker:config`, and the `pnpm repo:test:{fast,context,task,pr}` lanes. `pnpm dev` runs the web and static runner origins locally. Browser checks require Google Chrome; Python-service checks are not available yet. Database migration/seed commands are paused until the persistence slice.

Before handoff report changed scope, validation/browser evidence, missing commands and residual limitations. Keep docs concise and canonical long-form decisions under docs/.
