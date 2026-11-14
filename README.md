# Ancora

Local Python programming practice. Next.js App Router, React and TypeScript provide a workspace backed by PostgreSQL/Drizzle. FastAPI/Pydantic AI generate complete challenges; a separate static origin runs Python in disposable Pyodide workers.

## Current slice

Choose a concept and difficulty, generate a challenge, validate its reference in the isolated runner, and explicitly open the ready revision. Drafts, immutable challenge revisions and exact attempts survive reloads. Failed generation preserves the current editor; pending validation can resume, and one correction is an explicit action. The fixed synthetic exercise remains available without a model. No login or accounts are required.

## Local startup

Requirements: Node 22+, pnpm 10+, uv 0.11.18, Python 3.13, Docker and installed Google Chrome for browser checks.

```sh
pnpm install --frozen-lockfile
pnpm python:sync
pnpm docker:up
DATABASE_URL=postgresql://ancora:ancora@127.0.0.1:5433/ancora_practice pnpm db:migrate
pnpm dev
```

The new practice Compose project uses loopback port 5433 and its own volume. Existing legacy containers/volumes are untouched. Migration requires an explicit URL, verifies ledger history and refuses unknown states. See the [migration review](docs/architecture/practice-persistence.md) before targeting an existing database. Do not run schema push, regenerate a destructive schema diff or reset data.

Open http://127.0.0.1:3000/practice; the static runner is http://127.0.0.1:3001 and the Python service binds http://127.0.0.1:8001. Use the exact loopback hostname. The default development database matches the URL above; set DATABASE_URL for another reviewed database. `pnpm docker:down` stops the practice database without removing its volume.

For generation, export a random `PRACTICE_SERVICE_TOKEN` of at least 32 characters to the trusted web/Python servers, plus `PRACTICE_MODEL=gpt-6-luna`, `OPENAI_API_KEY` and `PRACTICE_GENERATION_ENABLED=1` for Python. Example files list the configuration; Python does not automatically load dotenv files. `pnpm dev` passes provider configuration only to Python and removes credentials from the static runner environment. Without generation configuration, the fixed exercise still works. Generating is an explicit paid model action; CI uses a synthetic provider and needs no OpenAI key.

```sh
pnpm code:check
pnpm contracts:check
pnpm web:typecheck
pnpm web:test
pnpm web:test:db
pnpm web:test:browser
pnpm repo:test:pr
pnpm python:check
```

Database/browser test wrappers create disposable PostgreSQL containers with tmpfs and random loopback ports. They never use a supplied DATABASE_URL or an existing volume. Have the project PostgreSQL image available locally first. Browser checks start their own web/runner/synthetic-generation servers and refuse occupied ports; stop a manual preview first. No live provider calls or real learner data belong in CI or test captures.

## Review and next work

- [Current architecture decision](docs/adr/0011-focus-on-local-programming-practice.md)
- [Persistence decision](docs/adr/0012-persist-fixed-practice-with-additive-migrations.md)
- [Generation decision](docs/adr/0013-bounded-generation-and-automated-checks.md)
- [Generation lifecycle](docs/architecture/challenge-generation.md)
- [Python conventions](docs/engineering/python-conventions.md)
- [Continuous integration](docs/engineering/continuous-integration.md)
- [Persistence contract and migration review](docs/architecture/practice-persistence.md)
- [Product specification](docs/product/programming-practice.md)
- [Execution plan](docs/exec-plans/programming-practice.md)
- [Runner boundary and limitations](docs/architecture/runner-spike.md)
- [Code quality and structure rules](docs/engineering/code-quality-conventions.md)
- [Testing strategy](docs/testing/testing-strategy.md)

The runner has no credentials or privileged product helpers. Its results are untrusted self-study evidence; reference/test agreement is only internal consistency. Hard browser-process memory quotas and hostile-code attestation remain unavailable.
