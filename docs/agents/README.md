# Agent Startup Flow

Ancora uses compact root guidance plus routing metadata. Agents should start narrow and open only the docs needed for the requested boundary.

## Required Startup

1. Read `AGENTS.md`.
2. Run `git status --short` before editing.
3. Read `CONTEXT.md` for domain language.
4. Read `docs/agents/repo-manifest.yaml` for routing.
5. Open the relevant project shard under `docs/agents/projects/`.
6. Open relevant ADRs from `docs/adr/`.

Do not read every shard by default. The manifest maps repo paths to one shard so agents can work without loading unrelated project context.

## Routing

- `apps/web`, `packages/ui`, `packages/shared-types`, and `docs/frontend` work starts with `docs/agents/projects/web.yaml`.
- `services/ai-runtime`, prompt, and schema work starts with `docs/agents/projects/ai-runtime.yaml`.
- `services/workers` work starts with `docs/agents/projects/workers.yaml`.
- `tools/eval-runner` and `evals` work starts with `docs/agents/projects/eval-runner.yaml`.
- `scripts`, `.github`, `infra`, and governance-doc work starts with `docs/agents/projects/scripts-ci.yaml`.

If a change crosses boundaries, read each affected shard and call out the cross-boundary impact in the handoff.

## Documentation Model

`AGENTS.md` is workflow-focused. Long-form guidance belongs in:

- `docs/engineering/documentation-governance.md`
- `docs/engineering/git-conventions.md`
- `docs/engineering/monorepo-conventions.md`
- `docs/frontend/nextjs-feature-first-convention.md`
- `docs/frontend/nextjs-naming-convention.md`
- `docs/testing/change-based-test-coverage-policy.md`
- `docs/ops/solo-dev-guardrails.md`
- `docs/exec-plans/README.md`

Architecture, ownership, storage, provider, auth/account, privacy, and deployment changes need an ADR update or a new ADR.
