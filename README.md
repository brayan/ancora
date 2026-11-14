# Ancora

Local Python programming practice. Next.js App Router, React and TypeScript provide the workspace; a separate static origin runs Pyodide in disposable browser workers. FastAPI/Pydantic AI challenge generation is the next service slice.

## Current slice

One fixed synthetic exercise proves the execution boundary. Run examples, check behavior and list-comprehension technique separately, Stop runaway code, and start another fresh runtime. No login, accounts, source ingestion, decks/cards, database access or live LLM calls. Drafts are not saved in this spike.

## Local startup

Requirements: Node 22+, pnpm 10+, installed Google Chrome for browser checks.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://127.0.0.1:3000/practice. The runner is http://127.0.0.1:3001. Use the exact loopback hostname; origins are intentionally distinct and restricted. `pnpm web:dev` and `pnpm runner:dev` can start each separately. No .env file, provider key or Docker database is needed for the spike.

```sh
pnpm code:check
pnpm quality:test
pnpm web:typecheck
pnpm web:test
pnpm web:test:browser
pnpm repo:test:pr
```

PostgreSQL/Drizzle remain selected for later persistence. Historical SQL/snapshots and existing data are retained unchanged. Migration generation/application and seeding are intentionally paused; no database reset is part of this work. Docker helpers remain available for the later persistence slice.

## Review and next work

- [Current architecture decision](docs/adr/0011-focus-on-local-programming-practice.md)
- [Product specification](docs/product/programming-practice.md)
- [Execution plan](docs/exec-plans/programming-practice.md)
- [Runner spike and limitations](docs/architecture/runner-spike.md)
- [Code quality and structure rules](docs/engineering/code-quality-conventions.md)
- [Testing strategy](docs/testing/testing-strategy.md)

The runner has no privileged bridge, provider credentials or product actions. Its results are untrusted self-study evidence; reference/test agreement is only internal consistency. Hard browser-process memory quotas and hostile-code attestation are unavailable. See the spike report before extending execution.
