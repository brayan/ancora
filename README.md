# Ancora

Local Python programming practice. Next.js App Router, React and TypeScript provide a workspace backed by PostgreSQL/Drizzle. A separate static origin runs Pyodide in disposable browser workers. FastAPI/Pydantic AI generation remains a later slice.

## Current slice

One fixed synthetic exercise supports saved drafts, exact submitted attempts, immutable challenge revisions and reload/resume. Run examples, check behavior and list-comprehension technique separately, Stop runaway code and start a fresh runtime. Draft conflicts require an explicit choice; unfinished attempts stay visible. No login, accounts or live LLM calls.

## Local startup

Requirements: Node 22+, pnpm 10+, Docker and installed Google Chrome for browser checks.

```sh
pnpm install --frozen-lockfile
pnpm docker:up
DATABASE_URL=postgresql://ancora:ancora@127.0.0.1:5433/ancora_practice pnpm db:migrate
pnpm dev
```

The new practice Compose project uses loopback port 5433 and its own volume. Existing legacy containers/volumes are untouched. Migration requires an explicit URL, verifies ledger history and refuses unknown states. See the [migration review](docs/architecture/practice-persistence.md) before targeting an existing database. Do not run schema push, regenerate a destructive schema diff or reset data.

Open http://127.0.0.1:3000/practice; the static runner is http://127.0.0.1:3001. Use the exact loopback hostname. The default development database matches the URL above; set DATABASE_URL in the web environment for another reviewed database. Provider keys are unnecessary. `pnpm docker:down` stops the practice database without removing its volume.

```sh
pnpm code:check
pnpm contracts:check
pnpm web:typecheck
pnpm web:test
pnpm web:test:db
pnpm web:test:browser
pnpm repo:test:pr
```

Database/browser test wrappers create disposable PostgreSQL containers with tmpfs and random loopback ports. They never use a supplied DATABASE_URL or an existing volume. Have the project PostgreSQL image available locally first. Browser checks start their own app/runner servers and refuse occupied ports; stop a manual preview first. No live provider calls or real learner data belong in test captures.

## Review and next work

- [Current architecture decision](docs/adr/0011-focus-on-local-programming-practice.md)
- [Persistence decision](docs/adr/0012-persist-fixed-practice-with-additive-migrations.md)
- [Persistence contract and migration review](docs/architecture/practice-persistence.md)
- [Product specification](docs/product/programming-practice.md)
- [Execution plan](docs/exec-plans/programming-practice.md)
- [Runner boundary and limitations](docs/architecture/runner-spike.md)
- [Code quality and structure rules](docs/engineering/code-quality-conventions.md)
- [Testing strategy](docs/testing/testing-strategy.md)

The runner has no credentials or privileged product helpers. Its results are untrusted self-study evidence; reference/test agreement is only internal consistency. Hard browser-process memory quotas and hostile-code attestation remain unavailable.
