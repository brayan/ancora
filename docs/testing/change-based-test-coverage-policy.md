# Change-Based Test Coverage Policy

Ancora should validate the boundary that changed without turning every small edit into a full repo run.

## General Rule

Run the narrowest meaningful validation available for the changed area. If expected commands do not exist yet, inspect available scripts and report the missing command surface.

## Docs-Only Changes

Use file-existence checks, manifest/shard inspection, and targeted search.

Expected checks for governance changes:

```bash
test -f AGENTS.md
test -f docs/agents/repo-manifest.yaml
find docs/agents/projects -type f | sort
find docs/adr -type f | sort
rg -n "Next\\.js|TypeScript|OpenAI|auth|account|pgvector|source material|defer" AGENTS.md CONTEXT.md docs
```

## Web Changes

Prefer web-specific lint, type, and test commands once `apps/web` exists. The web boundary should validate routing, accessibility-sensitive UI, typed API usage, and account-aware flows.

## AI Runtime Changes

Prefer `pnpm web:typecheck`, server-boundary tests, schema validation, API contract checks, and narrow eval smoke checks when prompts, retrieval, generation, or grading behavior changes.

## Worker Changes

Validate job behavior, retry/error paths, account scoping, and logging privacy inside the TypeScript server boundary. Do not introduce Redis, queue infrastructure, or a separate worker runtime without an ADR.

## Eval Changes

Run `make eval-smoke` when available. Eval fixtures must be synthetic or explicitly approved sample material, and reports must not leak private source material.

## Scripts, CI, and Infra Changes

Validate shell scripts and workflow syntax with the narrowest available command. Docker validation should stay local to accepted v1 services. Kubernetes and Terraform checks are out of scope until approved by ADR.

## Handoff

Every handoff should report:

- changed files
- validation commands run
- missing expected commands
- known residual risk
