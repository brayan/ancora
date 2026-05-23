# Documentation Governance

Ancora uses compact root guidance with canonical long-form docs under `docs/`.

## Documentation Layers

`AGENTS.md` is the root operating contract for coding agents. Keep it workflow-focused and short.

`CONTEXT.md` owns canonical product language. Add terms there when product concepts become shared across boundaries.

`docs/agents/repo-manifest.yaml` owns routing metadata. It should tell future agents which shard to open, not duplicate every rule.

`docs/agents/projects/*.yaml` owns boundary-specific guidance. Shards should be small enough that an agent can open only one for most tasks.

`docs/adr/*.md` owns decisions that change architecture, ownership, storage, provider, auth/account scope, privacy posture, deployment scope, or deferred platform scope.

Long-form operational guidance belongs in `docs/engineering`, `docs/frontend`, `docs/testing`, `docs/ops`, and `docs/exec-plans`.

## Update Rules

- Update `AGENTS.md` only when the root workflow contract changes.
- Update the repo manifest when routes, boundaries, commands, or canonical docs change.
- Update a project shard when ownership, allowed work, out-of-scope work, privacy rules, or validation changes for that boundary.
- Add or update an ADR before implementing a decision that changes accepted v1 architecture.
- Add or update `docs/engineering/git-conventions.md` when commit message or pull request title conventions change.
- Add or update `docs/frontend` when Next.js structure, naming, import-boundary, or UI code conventions change.
- Keep implementation plans under `docs/implementation/` or `docs/exec-plans/`.

## Privacy Rules

Private source material must not appear in docs, screenshots, fixtures, eval datasets, commits, or copied logs. Use synthetic examples, source IDs, chunk IDs, card IDs, deck IDs, prompt versions, and trace references.

## Documentation-Only Scope

Documentation-only prompts may add or update docs and routing metadata. They must not add app scaffolds, dependencies, migrations, executable feature code, generated fixtures, or infrastructure services.

## Review Expectations

Governance docs that affect architecture, auth/account scope, provider use, privacy posture, or agent workflow require human review before they become the basis for later implementation prompts.
