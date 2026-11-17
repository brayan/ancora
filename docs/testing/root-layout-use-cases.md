# Root layout and use-case refactor evidence

This change starts from main `59f862441a130470d0b1570861e13fb7c07cc4b0` in
`refactor/root-layout-use-cases`. [ADR 0018](../adr/0018-place-projects-at-root-and-use-operation-use-cases.md)
owns the accepted structure; older dated reports retain their historical paths.

## Scope

`web/` and `backend/` replace the two `apps/` projects. The Python distribution is
`ancora-backend`, with the unchanged `ancora` import package. Three operation use
cases expose `execute`, provider interfaces retain `generate`, and domain
validation modules are named after their validated content. HTTP schemas,
privacy, dispatch allowances, database ownership and runner capabilities retain
their existing contracts.

Workspace metadata, root-relative resources, startup, guards, exact Tach edges,
temporary architecture fixtures and agent routing use the new paths together.
The size guard's allowlist lookup moves one level upward from root `web/`; its
existing stale/malformed-entry fixtures use that layout. A core-discovery
regression requires all three use-case modules to remain inside checked
application sources.

## Preservation checks

SHA-256 comparisons confirm **31 migration, prompt and canonical JSON artifact
files** retain their bytes. AST body comparisons confirm **11 use-case/domain
functions** retain their logic; operation names and import paths change. The Node
lock's package/snapshot graph is unchanged, with only the web importer/link depth
updated. uv retains its dependency versions while changing the local project
name/path. Frozen installs and convention preflight passed.

## Validation

Verified locally on 2026-11-17 with Node 26.0.0, uv 0.11.18, Python 3.13, Docker
and installed Google Chrome. Hosted CI separately targets Node 22.

- `pnpm install --frozen-lockfile` and `pnpm python:sync`: passed.
- `UV_OFFLINE=1 pnpm python:check`: passed, including Ruff, packaged layout checks,
  strict Pyright, exact Tach/domain-import checks and **215 pytest cases**.
- `pnpm repo:test:pr`: passed, including convention/context/format checks, schema
  drift, TypeScript checks, **8 config**, **20 quality/runner**, **40 web unit**,
  **48 disposable-PostgreSQL** and **1 eval** test. Eval smoke remains a scaffold.
- `UV_OFFLINE=1 pnpm web:test:browser`: **60 passed** with real Google Chrome,
  disposable PostgreSQL and typed synthetic providers, with no test retries.
- After self-review: Python lint, **34 architecture regressions**, code checks and
  the **48 disposable-PostgreSQL cases** passed again for the affected paths.

A separate fresh tmpfs PostgreSQL database accepted `pnpm db:migrate`. Root
`pnpm dev` then returned HTTP 200 for `/practice`, `/api/practice/session`, the
static runner and the token-authorized backend `/v1/status`; generation reported
disabled. Only task-created processes/containers were stopped. Existing databases
and volumes were untouched.

Self-review retained the existing web service factories and feature-first
structure while giving Python operations explicit use-case names. No new
forwarding layers, provider calls, dependencies, migrations or protocol fields
were introduced. Runtime limits and deferred live coaching evaluation retain the
existing v1 limitations. Historical validation reports remain historical evidence.
