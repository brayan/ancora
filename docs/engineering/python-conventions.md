# Python conventions

Ancora adapts the engineering playbook's [Python typing standard](https://github.com/brayan/engineering-playbook/blob/main/docs/engineering/python-typing-standard.md), [service conventions](https://github.com/brayan/engineering-playbook/blob/main/docs/backend/python-service-conventions.md), [test naming](https://github.com/brayan/engineering-playbook/blob/main/docs/testing/test-naming-convention.md) and [contextual paragraph spacing](https://github.com/brayan/engineering-playbook/blob/main/docs/engineering/code-paragraph-spacing.md). The tooling baseline comes from Sailtech's `apps/platform/ops-agent/pyproject.toml` at `e2a6ce0`, adapted to Ancora's execution boundary and workspace.

## Runtime and dependency ownership

The root uv workspace supports Python `>=3.13,<3.15`; `.python-version`, CI, Ruff's `py313` target and Pyright's `3.13` target select the minimum version. The browser's pinned Pyodide runtime is separate and must remain compatible with the harness. Install uv `0.11.18`, then run `pnpm python:sync` from the repository root. `uv.lock` locks the whole workspace. Root `pyproject.toml` owns the pinned quality/test tools; `apps/api/pyproject.toml` owns its runtime dependencies. Review manifest changes, run `uv lock` intentionally, and commit the resulting lockfile together. Frozen commands never update it.

FastAPI delivers bounded generation and hint APIs, Pydantic validates untrusted HTTP/model output, and Pydantic AI stays behind a typed provider adapter. Keep HTTP thin, deterministic validation independently testable, and create packages only when they own real behavior. Python never owns product database writes. Provider configuration is explicit; SDK/framework retries cannot expand the durable generation allowance.

## Package structure and dependency direction

Follow [ADR 0014](../adr/0014-layer-generation-around-a-framework-free-core.md). The service package has root `api/`, `application/`, `domain/` and `infrastructure/` boundaries. Split API routers by capability and Pydantic schemas by boundary/domain; do not restore a global `contracts.py`. `bootstrap.py` wires concrete adapters and their lifecycle; `main.py` starts the process. FastAPI `Depends` stays in the API.

Domain models and application commands/results are plain dataclasses. Neither layer imports Pydantic, FastAPI, vendor SDKs or transport DTOs. Application services coordinate operations with meaningful orchestration; application-owned `interfaces/` use typed `Protocol` dependencies and plain core models. Name provider interfaces separately from the services that consume them. Deterministic domain rules can remain functions. Avoid forwarding-only use-case classes and repositories for non-persistence operations.

API and infrastructure Pydantic models validate untrusted data, then map explicitly to/from core values. Wire versions and JSON case encoding stay at those boundaries. The HTTP and LLM schemas each have parity tests against the canonical versioned artifact.

### Architecture guard

The playbook's [Python project tooling](https://github.com/brayan/engineering-playbook/blob/c993c5bc2da0210604c8f2d82939c1ed109f9d23/docs/engineering/python-project-tooling.md) defines the shared baseline. Ancora pins Tach `0.35.3` as a root development tool. The repository-root [tach.toml](../../tach.toml) governs `apps/api/src`; the browser harness and standalone shared checkers have no service layers and remain under their existing checks.

| Module | Allowed first-party dependencies |
|---|---|
| Domain challenges | None. |
| Domain hints/coaching | Shared challenge models only. |
| Application commands/results/errors | Domain models. |
| Application interfaces | Plain application commands/results. |
| Application services | Application commands/interfaces and domain models/rules. |
| API | Application commands/interfaces/services, domain values/errors and settings. |
| Infrastructure | Application commands/results/errors and domain values/errors; no API or application services. |
| Settings | None. |
| Bootstrap | API, application interfaces/services, infrastructure and settings. |

The package initializers have no outward dependencies. `main.py` starts Uvicorn with the `ancora.bootstrap:create_app` import string, which Tach does not model as a static edge. The graph records observed static dependencies; structural provider implementations do not need to import their `Protocol`. Challenge models are a public cross-feature interface; only application services may import challenge orchestration rules. The configuration owns the exact module/interface lists.

`pnpm python:architecture` runs `tach check --exact` from the frozen workspace. It also runs inside `python:check`, including the existing Python GitHub Actions job. Exact edges reject unused declarations, cycles are forbidden, ungoverned root modules are rejected and `TYPE_CHECKING` imports count as dependencies. API and infrastructure are sibling adapters; only bootstrap wires them together. Do not run `tach sync` in CI or add dependencies to silence failures. Review intentional graph changes alongside their code and ADR.

Tach's first-party graph does not prove framework independence. Pytest separately rejects non-standard-library/non-core imports (including under `TYPE_CHECKING`), preserves absolute imports and imports the whole core with site packages disabled. Architecture fixtures copy the actual source/configuration to temporary directories and prove compliant imports pass while forbidden directions, private cross-feature access, root modules, unused edges and cycles fail. They parse code without executing solutions or starting the service. Tach's optional pytest impact-selection plugin is disabled with `-p no:tach`; the full offline suite remains the default. See [Tach configuration](https://docs.gauge.sh/usage/configuration/).

The backend folder is `apps/api`, its import package is `ancora`, and its distribution is `ancora-api`. Keep workspace, startup, test and agent-routing paths aligned when moving it. Each HTTP operation declares a summary, router tag, response model and error-response metadata, with a concise docstring explaining meaningful behavior and side effects. Document provider dispatch separately from readiness and configuration availability separately from health checks. Schema/model fields carry structural details; comments explain non-obvious constraints. OpenAPI metadata is testable in-process while documentation HTTP routes remain disabled. See [the backend contract](../../apps/api/README.md).

## Maintained code and strict checks

Root Ruff and Pyright configuration covers service source/tests, `apps/web/runner/harness.py`, AST-only host tests under `apps/web/tests/python` and the shared checker/fixtures under `scripts/quality/python`. Ruff retains its defaults and adds `ANN`, `B`, `I`, `UP` and `SIM`. Pyright checks all these paths in strict mode, including typed fixtures and fakes. No maintained path is excluded or globally weakened for a dynamic dependency.

Declare parameter and return annotations, parameterize collections, and narrow unknown values at validation boundaries. Prefer `object`, typed models and small `Protocol` interfaces over propagating `Any`. Unavoidable exceptions need an exact-line, rule-specific Ruff or Pyright suppression and a reason; Pyright rejects stale ignores and ignores generic `type: ignore` comments. Keep untyped SDK behavior inside its adapter. Runtime validation must enforce exact types and bounds rather than relying on static annotations or coercion.

Use `test_should_<outcome>_when_<condition>` for pytest functions and meaningful setup/execution/assertion paragraphs. Typed fakes keep provider tests deterministic and offline. Host pytest may parse and inspect synthetic Python ASTs; it must never execute learner submissions or generated solutions. Actual challenge execution belongs only to the isolated browser runner. Do not put private code/material in fixtures, logs, snapshots or evals.

Follow the playbook's [Python parameter layout](https://github.com/brayan/engineering-playbook/blob/b6d8ae17a005fb64f3440605dbdc8d2912fef46e/docs/engineering/python-parameter-layout.md): definitions with two or more declared parameters put each on a new line, with the closing parenthesis on a separate line and a trailing comma. Count `self`/`cls`, keyword-only and variadic parameters. Calls and lambdas are outside this rule. The committed shared checker under `scripts/quality/python` runs in `python:lint`, so `python:check` and the existing Python GitHub Actions job reject violations. Ruff preserves the layout through magic trailing commas. See the [local provenance and update instructions](../../scripts/quality/python/README.md).

## Commands

Follow the shared [Python Class Declaration Spacing](https://github.com/brayan/engineering-playbook/blob/b6d8ae17a005fb64f3440605dbdc8d2912fef46e/docs/engineering/python-class-declaration-spacing.md) standard. Ancora explicitly enables its checker through `python:lint` over the same maintained Python scopes as the other layout rules. The shared standard owns multiline/section-comment exceptions; local commands and provenance stay here.

Follow the playbook’s [Python Condition Layout](https://github.com/brayan/engineering-playbook/blob/b6d8ae17a005fb64f3440605dbdc8d2912fef46e/docs/engineering/python-condition-layout.md): extract multiline `if`/`elif` conditions into named predicates while preserving evaluation order. The shared rule/checker owns its scope and exclusions. See [Ancora’s lint/CI integration](python-condition-layout.md) and [copied-source provenance](../../scripts/quality/python/README.md); no local rule fork remains.

| Command | Scope |
|---|---|
| `pnpm python:sync` | Frozen uv workspace install, including development tools. |
| `pnpm python:lint` | Ruff and deterministic parameter, condition and class declaration spacing checks over maintained Python. |
| `pnpm python:format:check` | Read-only Ruff formatting check over the same paths. |
| `pnpm python:typecheck` | Strict Pyright over maintained source and tests. |
| `pnpm python:test` | Offline pytest: service behavior, architecture regressions, safe harness AST checks and all shared layout fixtures. |
| `pnpm python:architecture` | Read-only Tach import graph and public-interface checks over the service source. |
| `pnpm python:check` | Lint, formatting, strict types, architecture, then pytest. |

These use the same locked environment locally and in [CI](continuous-integration.md). Perform contextual self-review before running checks; formatter success does not prove paragraph quality. Service/host tests cannot establish isolation or generation quality. Real Chrome checks establish browser behavior; paid quality evaluation is separate and requires an explicit model and remaining budget.

Selected-attempt coaching applies the same plain-core/provider boundary; source arrives only through explicit Next.js sharing and is never executed by host tests or the service. See [ADR 0016](../adr/0016-persist-selected-attempt-coaching.md).
