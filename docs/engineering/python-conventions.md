# Python conventions

Ancora adopts the engineering playbook’s [code conventions](https://github.com/brayan/engineering-playbook/blob/b6de917c5280f7ee0ab6cf0a8ca2512ed9291477/docs/engineering/python-code-conventions.md), [typing standard](https://github.com/brayan/engineering-playbook/blob/b524f009fcbb9be7c0d488d9fe336f6c5c094581/docs/engineering/python-typing-standard.md) and [project tooling](https://github.com/brayan/engineering-playbook/blob/b6de917c5280f7ee0ab6cf0a8ca2512ed9291477/docs/engineering/python-project-tooling.md). Those documents own shared rules; this page owns local integration. Shared [contextual paragraph spacing](https://github.com/brayan/engineering-playbook/blob/main/docs/engineering/code-paragraph-spacing.md) and [test naming](https://github.com/brayan/engineering-playbook/blob/main/docs/testing/test-naming-convention.md) apply alongside automated checks.

## Workspace and policy artifact

Use uv `0.11.18` and Python `3.13`; the workspace supports `>=3.13,<3.15`. `.python-version`, CI, Ruff and Pyright target the minimum version. The browser’s pinned Pyodide runtime is separate. Root `pyproject.toml` owns development tools; `backend/pyproject.toml` owns runtime dependencies. Review changes, run `uv lock` intentionally and commit the manifest/lock together. Frozen commands never update them.

The development dependency `sailtech-python-checks[architecture]==0.10.3` installs a committed wheel from `config/quality/python`; `uv.lock` records its hash. [Provenance and upgrade instructions](../../config/quality/python/README.md) identify the immutable reviewed source and reproducible artifact. Normal validation needs no sibling checkout or checker-source download. The shared package owns implementation/fixtures; Ancora tests the installed artifact, CLI wiring, fail-closed orchestration and actual import graph.

## Maintained code

Ruff, strict Pyright and the four installed layout/ordering commands cover service source/tests, `web/runner/harness.py` and `web/tests/python`. Ruff retains its defaults and adds typing, imports, bugbear, modernization, simplification, naming, unused-argument and function-size checks, plus stale-suppression detection. Exact selectors/budgets live in `pyproject.toml`.

Declare parameter/return annotations, parameterize collections and narrow unknown data at validation boundaries. Prefer `object`, typed models and small `Protocol` interfaces over `Any`. Keep dynamic SDK behavior inside typed adapters or stubs. Static annotations do not replace runtime validation.

The packaged commands enforce:

- Definitions with two or more parameters use one per line and a trailing comma, including `self`/`cls`.
- Multiline `if`/`elif` conditions become meaningful named predicates, preserving short-circuit behavior. See [condition integration](python-condition-layout.md).
- Class declaration spacing and separators between declaration kinds follow shared lexical rules. Single-line class `model_config` may directly precede annotated fields (`PYORD005`); multiline configuration keeps its separator.
- Dependency-aware declaration/class order, public functions before helpers, alphabetical tests, keyword-only parameters, explicit call keywords, enum members and supported static dictionary constant keys.
- Module alias groups precede unrelated definitions when dependencies permit (`PYORD011`); adjacent aliases have no blank gaps except explicit section-comment groups (`PYORD012`). Required getters/classes stay before their aliases. Reads of enclosing/control-flow bindings retain their position before later alias assignments, both at module scope and within conditional suites; unknown bindings are not treated as forward references to repair. The [shared rule](https://github.com/brayan/engineering-playbook/blob/b6de917c5280f7ee0ab6cf0a8ca2512ed9291477/docs/engineering/python-code-conventions.md#module-type-alias-groups) owns section boundaries and scope.
- No suppression comments, ordering baselines or per-file ordering opt-outs. Fix or restructure the source.

Preserve positional APIs and dataclass constructor field sequences. Dependencies precede consumers. Precompute effectful arguments in their original evaluation order before sorting call keywords. Review framework validators, dictionary iteration and enum values before moving declarations. The checker reports violations without executing or rewriting source; passing it does not prove behavioral equivalence. Formatting does not replace contextual paragraph review.

Constructors follow the same parameter rule: `__init__(self, model, api_key, *, transport=...)` preserves positional `model, api_key`; parameters after `*` are alphabetical. There is no blanket alphabetical rule for every constructor parameter. Making owned constructors keyword-only would require an explicit API/call-site migration; it is not implied by a passing ordering check. Dataclass positional field sequences and framework-required signatures also retain their contracts.

## Service architecture

Under [ADR 0019](../adr/0019-use-callable-python-use-cases.md), `__call__` is the
single operation entrypoint. Name concrete instance variables and parameters
after the class in `snake_case`, including in routes and tests. Bind instances
created locally before invoking them. For example, assign
`generate_challenge = GenerateChallenge(provider)` and then invoke
`await generate_challenge(command)`. Reserve `use_case`
for code that handles operations generically. Preserve constructor injection and
typed commands/results. Do not retain forwarding `execute`, `run` or `call`
aliases.

ADR 0018 owns operation use cases in `application/use_cases`. Do not add a class or
function that only forwards one call and returns its result. The consumer calls
the existing public application interface or domain operation directly, within
Tach's declared visibility. Do not replace a forwarding use case with a forwarding
service/helper or bypass required validation, policy, scope, dispatch allowance or
error semantics. Delivery never calls a concrete infrastructure adapter.
Do not invent validation, mapping or logging to make a forwarding class appear
necessary; the operation must actually require behavior beyond delegation.

Review responsibility rather than counting calls: generation, hint and coaching
use cases validate acceptance/input/output around their provider dispatch, while
status routes already read configuration through provider interfaces directly.
Pure domain validation remains in intent-specific functions/modules. Shared
[Python service conventions](https://github.com/brayan/engineering-playbook/blob/main/docs/backend/python-service-conventions.md)
own the repo-neutral architecture guidance; this is Ancora's local integration.

[ADR 0020](../adr/0020-publish-python-feature-contracts.md) gives each of
`challenges`, `hints` and `coaching` its own FastAPI router, schemas, dependencies,
mappers and HTTP error translations under `api/`. `shared/api` owns common
transport behavior and wire primitives. `config/settings.py` parses configuration,
`bootstrap.py` mounts routers and owns concrete resources, and `main.py` starts
Uvicorn. Feature tests are flat under `backend/tests/<feature>`; service-wide
startup, contract and import-graph checks live at the test root.

[ADR 0014](../adr/0014-layer-generation-around-a-framework-free-core.md) owns the
plain core and separate HTTP/provider mappings. Provider protocols live in the
consuming feature's `application/ports` and describe capabilities such as
`HintProvider`. Put the source and destination representations in every mapper
name. When they represent the same concept, name it once, as in
`map_http_challenge_draft_to_domain` and `map_domain_challenge_draft_to_provider`.
When types serve different roles within one operation, name the operation once
and include both roles, as in `map_http_generation_input_to_application_command`
and `map_application_generation_command_to_provider_input`. Apply the same
convention to named helpers inside mappers, as in `map_provider_case_to_domain`.

Use cases call their ports directly and pure validation remains in its domain
module. Canonical wire artifacts live in `packages/schemas`.

Next.js remains the sole durable-record/migration owner. Python never writes the product database or executes reference/learner solutions. Provider configuration is explicit and framework retries cannot expand dispatch allowances. [ADR 0016](../adr/0016-persist-selected-attempt-coaching.md) also requires affirmative sharing of saved code.

### Import enforcement

`pnpm python:architecture` runs `tach check --exact` and the shared external
domain guard. [tach.toml](../../tach.toml) owns exact module edges. Each feature
API has its own boundary. [feature-interfaces.toml](../../feature-interfaces.toml)
owns cross-feature symbol visibility. Consumer imports are direct from the
owning modules. Pytest checks published and private siblings, aliased and
type-only imports, layer direction, independence of shared code and cycles
within and between features using the resolved Tach graph. Only bootstrap
wires concrete adapters. The locked Tach analyzes static imports, so
`main.py` uses the existing Uvicorn import string and startup tests exercise
that boundary. Never run `tach sync` in CI.

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
