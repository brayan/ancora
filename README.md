# Ancora

Local Python programming practice. Next.js App Router, React and TypeScript provide a workspace backed by PostgreSQL/Drizzle. FastAPI/Pydantic AI generate complete challenges; a separate static origin runs Python in disposable Pyodide workers.

## Local v1

Choose a concept and difficulty, generate a challenge, validate its reference in the isolated runner, and explicitly open the ready revision. Drafts, immutable challenge revisions and exact attempts survive reloads. Failed generation preserves the current editor; pending validation can resume, and one correction is an explicit action. Confirmed solution reveal preserves your draft, records the first reveal and marks later attempts as assisted. Requested progressive hints are saved per revision and mark subsequent attempts; they send public challenge context and earlier hints, never your code. Selected-attempt coaching shares only the saved code you explicitly confirm, public context and an aggregate result; saved feedback leaves your draft and verdict intact. The fixed synthetic exercise remains available without a model. No login or accounts are required.

## Local startup

Requirements: Node 22+, pnpm 10.8.0, uv 0.11.18, Python 3.13, Docker and ripgrep (`rg`). Browser checks also require installed Google Chrome. CI uses Node 22 and Python 3.13; dependency versions come from the committed locks.

```sh
pnpm install --frozen-lockfile
pnpm python:sync
pnpm docker:up
export DATABASE_URL=postgresql://ancora:ancora@127.0.0.1:5433/ancora_practice
pnpm db:migrate
pnpm dev
```

The new practice Compose project uses loopback port 5433 and its own volume. Existing legacy containers/volumes are untouched. Migration requires an explicit URL, verifies ledger history and refuses unknown states. See the [migration review](docs/architecture/practice-persistence.md) before targeting an existing database. Do not run schema push, regenerate a destructive schema diff or reset data.

Open http://127.0.0.1:3000/practice; the static runner is http://127.0.0.1:3001 and the Python service binds http://127.0.0.1:8001. Use the exact loopback hostname. The default development database matches the URL above; set DATABASE_URL for another reviewed database. `pnpm docker:down` stops the practice database without removing its volume.

The Python backend lives in [apps/api](apps/api/README.md), with import package `ancora` and distribution `ancora-api`. Run it separately with `uv run --frozen --all-packages python -m ancora.main`. Its router metadata documents success/error contracts in-process; Swagger/OpenAPI HTTP endpoints remain disabled.

For generation, export a random `PRACTICE_SERVICE_TOKEN` of at least 32 characters to the trusted web/Python servers, plus `PRACTICE_MODEL=gpt-6-luna`, `OPENAI_API_KEY` and `PRACTICE_GENERATION_ENABLED=1` for Python. Example files list the configuration; Python does not automatically load dotenv files. `pnpm dev` passes provider configuration only to Python and removes credentials from the static runner environment. Without generation configuration, the fixed exercise still works. Enable hint requests independently with `PRACTICE_HINTS_ENABLED=1` in Python. Generating or requesting hints is an explicit paid model action; CI uses a synthetic provider and needs no OpenAI key.

## Offline verification

After the frozen installs above, make the test image available and run the three independent CI lanes:

```sh
docker pull pgvector/pgvector:pg16
pnpm repo:test:pr
pnpm python:check
pnpm web:test:browser
```

The repository lane includes conventions, contracts, types, unit tests and disposable database checks. The Python lane includes Ruff, shared layout guards, strict Pyright, Tach and offline pytest. Browser checks use installed Google Chrome and synthetic providers for generation, hints and coaching. The eval CLI smoke is an empty scaffold; it is not model-quality evidence. See [v1 completion evidence](docs/testing/v1-completion.md) for the verified setup, upgrade paths and limitations.

Database/browser test wrappers create disposable PostgreSQL containers with tmpfs and random loopback ports. They never use a supplied DATABASE_URL or an existing volume. Have the project PostgreSQL image available locally first. Browser checks start their own web/runner/synthetic-generation servers and refuse occupied ports; stop a manual preview first. No live provider calls or real learner data belong in CI or test captures.

## Review and next work

- [Current architecture decision](docs/adr/0011-focus-on-local-programming-practice.md)
- [Persistence decision](docs/adr/0012-persist-fixed-practice-with-additive-migrations.md)
- [Generation decision](docs/adr/0013-bounded-generation-and-automated-checks.md)
- [Generation lifecycle](docs/architecture/challenge-generation.md)
- [Solution reveal and assistance](docs/architecture/practice-assistance.md)
- [Progressive hints](docs/architecture/progressive-hints.md)
- [Selected-attempt coaching](docs/architecture/selected-attempt-coaching.md)
- [Python conventions](docs/engineering/python-conventions.md)
- [Continuous integration](docs/engineering/continuous-integration.md)
- [Persistence contract and migration review](docs/architecture/practice-persistence.md)
- [Product specification](docs/product/programming-practice.md)
- [Execution plan](docs/exec-plans/programming-practice.md)
- [Runner boundary and limitations](docs/architecture/runner-spike.md)
- [Code quality and structure rules](docs/engineering/code-quality-conventions.md)
- [Testing strategy](docs/testing/testing-strategy.md)
- [Next improvements](docs/roadmap/next-improvements.md)

The runner has no credentials or privileged product helpers. Its results are untrusted self-study evidence; reference/test agreement is only internal consistency. Hard browser-process memory quotas and hostile-code attestation remain unavailable.

Selected-attempt coaching is independently enabled with `PRACTICE_COACHING_ENABLED=1` in Python. See [sharing, lifecycle and migration 0010](docs/architecture/selected-attempt-coaching.md). CI stays offline; live coaching quality evaluation needs its own model/budget approval.
