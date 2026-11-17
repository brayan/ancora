# Python conventions

Ancora adopts the engineering playbook’s [code conventions](https://github.com/brayan/engineering-playbook/blob/ee14579643fb0c5e9779731a8d117f3509b8c5e8/docs/engineering/python-code-conventions.md), [typing standard](https://github.com/brayan/engineering-playbook/blob/ee14579643fb0c5e9779731a8d117f3509b8c5e8/docs/engineering/python-typing-standard.md) and [project tooling](https://github.com/brayan/engineering-playbook/blob/ee14579643fb0c5e9779731a8d117f3509b8c5e8/docs/engineering/python-project-tooling.md). Those documents own shared rules; this page owns local integration. Shared [contextual paragraph spacing](https://github.com/brayan/engineering-playbook/blob/main/docs/engineering/code-paragraph-spacing.md) and [test naming](https://github.com/brayan/engineering-playbook/blob/main/docs/testing/test-naming-convention.md) apply alongside automated checks.

## Workspace and policy artifact

Use uv `0.11.18` and Python `3.13`; the workspace supports `>=3.13,<3.15`. `.python-version`, CI, Ruff and Pyright target the minimum version. The browser’s pinned Pyodide runtime is separate. Root `pyproject.toml` owns development tools; `apps/api/pyproject.toml` owns runtime dependencies. Review changes, run `uv lock` intentionally and commit the manifest/lock together. Frozen commands never update them.

The development dependency `sailtech-python-checks[architecture]==0.10.1` installs a committed wheel from `config/quality/python`; `uv.lock` records its hash. [Provenance and upgrade instructions](../../config/quality/python/README.md) identify the immutable reviewed source and reproducible artifact. Normal validation needs no sibling checkout or checker-source download. The shared package owns implementation/fixtures; Ancora tests the installed artifact, CLI wiring, fail-closed orchestration and actual import graph.

## Maintained code

Ruff, strict Pyright and the four installed layout/ordering commands cover service source/tests, `apps/web/runner/harness.py` and `apps/web/tests/python`. Ruff retains its defaults and adds typing, imports, bugbear, modernization, simplification, naming, unused-argument and function-size checks, plus stale-suppression detection. Exact selectors/budgets live in `pyproject.toml`.

Declare parameter/return annotations, parameterize collections and narrow unknown data at validation boundaries. Prefer `object`, typed models and small `Protocol` interfaces over `Any`. Keep dynamic SDK behavior inside typed adapters or stubs. Static annotations do not replace runtime validation.

The packaged commands enforce:

- Definitions with two or more parameters use one per line and a trailing comma, including `self`/`cls`.
- Multiline `if`/`elif` conditions become meaningful named predicates, preserving short-circuit behavior. See [condition integration](python-condition-layout.md).
- Class declaration spacing and separators between declaration kinds follow shared lexical rules. Single-line class `model_config` may directly precede annotated fields (`PYORD005`); multiline configuration keeps its separator.
- Dependency-aware declaration/class order, public functions before helpers, alphabetical tests, keyword-only parameters, explicit call keywords, enum members and supported static dictionary constant keys.
- Module alias groups precede unrelated definitions when dependencies permit (`PYORD011`); adjacent aliases have no blank gaps except explicit section-comment groups (`PYORD012`). Required getters/classes stay before their aliases. The [shared rule](https://github.com/brayan/engineering-playbook/blob/ee14579643fb0c5e9779731a8d117f3509b8c5e8/docs/engineering/python-code-conventions.md#module-type-alias-groups) owns section boundaries and scope.
- No suppression comments, ordering baselines or per-file ordering opt-outs. Fix or restructure the source.

Preserve positional APIs and dataclass constructor field sequences. Dependencies precede consumers. Precompute effectful arguments in their original evaluation order before sorting call keywords. Review framework validators, dictionary iteration and enum values before moving declarations. The checker reports violations without executing or rewriting source; passing it does not prove behavioral equivalence. Formatting does not replace contextual paragraph review.

Constructors follow the same parameter rule: `__init__(self, model, api_key, *, transport=...)` preserves positional `model, api_key`; parameters after `*` are alphabetical. There is no blanket alphabetical rule for every constructor parameter. Making owned constructors keyword-only would require an explicit API/call-site migration; it is not implied by a passing ordering check. Dataclass positional field sequences and framework-required signatures also retain their contracts.

## Service architecture

[ADR 0017](../adr/0017-organize-python-api-by-capability.md) owns the Lumera-aligned feature-first layout: root `api/` and `config/`, with `challenges/`, `hints/` and `coaching/` each containing domain/application and `infrastructure/ai`. `shared/application` contains only the common provider-interruption error. Challenge contracts/value validation remain public feature-owned dependencies; acceptance rules and concrete adapters remain private. Create only packages with real content.

[ADR 0014](../adr/0014-layer-generation-around-a-framework-free-core.md) still owns plain core models and separate transport/provider mappings. Domain/application models are dataclasses; neither layer imports Pydantic, FastAPI, SDKs or transport DTOs. Application services coordinate meaningful operations through application-owned `interfaces`, retaining Ancora's agreed name. Deterministic rules may remain functions; avoid forwarding-only use-case classes and repositories for non-persistence operations.

API/provider Pydantic schemas validate their own untrusted boundaries and map explicitly to plain core values. Split routers and dependency accessors by capability, keep `Depends` in the root API, and document HTTP summaries, tags, response/error models and meaningful side effects. Wire/schema parity remains tested against canonical artifacts. `config/settings.py` parses environment configuration; `bootstrap.py` wires adapters/lifecycles; `main.py` starts Uvicorn. The import package is `ancora`, distribution `ancora-api`, under `apps/api`.

Next.js remains the sole durable-record/migration owner. Python never writes the product database or executes reference/learner solutions. Provider configuration is explicit and framework retries cannot expand dispatch allowances. [ADR 0016](../adr/0016-persist-selected-attempt-coaching.md) also requires affirmative sharing of saved code.

### Import enforcement

`pnpm python:architecture` runs `tach check --exact`, then `sailtech-check-domain-imports --source-root apps/api/src`. Root [tach.toml](../../tach.toml) owns first-party modules, exact dependencies and public interfaces. Only bootstrap wires the API/infrastructure siblings. Root modules, unused edges, cycles, forbidden directions and private cross-feature imports fail; `TYPE_CHECKING` counts. `main.py` uses the `ancora.bootstrap:create_app` import string; Tach models static imports. Structural provider implementations need not import their `Protocol`. Never run `tach sync` in CI or add edges just to silence a failure.

The shared domain command discovers all three nested domain directories and uses compatible locked Tach to reject third-party imports, including under `TYPE_CHECKING`, regardless of exclusions. Syntax/backend failures fail closed. Ancora separately discovers every nested application package, restricts imports to standard-library/core modules, requires absolute layer imports and imports the entire core without site packages. A discovery regression prevents folder moves from making these checks vacuous. Temporary-project regressions cover each domain, cross-feature application/adapter imports and private challenge rules. Pytest disables Tach’s optional impact-selection plugin (`-p no:tach`) to retain the full offline suite.

## Commands and evidence

| Command | Scope |
|---|---|
| `pnpm python:sync` | Frozen workspace install, including the reviewed policy wheel. |
| `pnpm python:lint` | Ruff, parameters, conditions, class spacing and ordering/suppression checks. |
| `pnpm python:format:check` | Read-only Ruff formatting. |
| `pnpm python:typecheck` | Strict Pyright over maintained source/tests. |
| `pnpm python:architecture` | Exact first-party graph/public interfaces and shared external-domain guard. |
| `pnpm python:test` | Offline behavior, contracts, architecture, artifact and safe harness AST tests. |
| `pnpm python:check` | Lint, formatting, types, architecture, then pytest. |
| `pnpm quality:test` | Ancora-owned tool orchestration and convention regressions. |

[CI](continuous-integration.md) uses these same entry points. Validation invokes no providers and needs no provider credentials. Live evaluation requires a separately selected model and budget. Use synthetic material; private code must not enter fixtures, logs, screenshots or evals.

Host tests may parse synthetic ASTs and inspect safe value rules. Actual source execution and learner exception handling belong to the browser’s Pyodide adapter, with a fresh solution namespace and bounded reports. See [runner boundaries/limits](../architecture/runner-spike.md); host checks do not establish browser isolation or model quality.
