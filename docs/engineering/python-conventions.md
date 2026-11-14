# Python conventions

Ancora adapts the engineering playbook's [Python typing standard](https://github.com/brayan/engineering-playbook/blob/main/docs/engineering/python-typing-standard.md), [service conventions](https://github.com/brayan/engineering-playbook/blob/main/docs/backend/python-service-conventions.md), [test naming](https://github.com/brayan/engineering-playbook/blob/main/docs/testing/test-naming-convention.md) and [contextual paragraph spacing](https://github.com/brayan/engineering-playbook/blob/main/docs/engineering/code-paragraph-spacing.md). The tooling baseline comes from Sailtech's `apps/platform/ops-agent/pyproject.toml` at `e2a6ce0`, adapted to Ancora's execution boundary and workspace.

## Runtime and dependency ownership

The root uv workspace supports Python `>=3.13,<3.15`; `.python-version`, CI, Ruff's `py313` target and Pyright's `3.13` target select the minimum version. The browser's pinned Pyodide runtime is separate and must remain compatible with the harness. Install uv `0.11.18`, then run `pnpm python:sync` from the repository root. `uv.lock` locks the whole workspace. Root `pyproject.toml` owns the pinned quality/test tools; `apps/practice-service/pyproject.toml` owns its runtime dependencies. Review manifest changes, run `uv lock` intentionally, and commit the resulting lockfile together. Frozen commands never update it.

FastAPI delivers a bounded generation API, Pydantic validates untrusted HTTP/model output, and Pydantic AI stays behind a typed provider adapter. Keep HTTP thin, deterministic validation independently testable, and create packages only when they own real behavior. Python never owns product database writes. Provider configuration is explicit; SDK/framework retries cannot expand the durable generation allowance.

## Package structure and dependency direction

Follow [ADR 0014](../adr/0014-layer-generation-around-a-framework-free-core.md). The service package has root `api/`, `application/`, `domain/` and `infrastructure/` boundaries. Split API routers by capability and Pydantic schemas by boundary/domain; do not restore a global `contracts.py`. `bootstrap.py` wires concrete adapters and their lifecycle; `main.py` starts the process. FastAPI `Depends` stays in the API.

Domain models and application commands/results are plain dataclasses. Neither layer imports Pydantic, FastAPI, vendor SDKs or transport DTOs. Application services coordinate operations with meaningful orchestration; application-owned `interfaces/` use typed `Protocol` dependencies and plain core models. Name provider interfaces separately from the services that consume them. Deterministic domain rules can remain functions. Avoid forwarding-only use-case classes and repositories for non-persistence operations.

API and infrastructure Pydantic models validate untrusted data, then map explicitly to/from core values. Wire versions and JSON case encoding stay at those boundaries. The HTTP and LLM schemas each have parity tests against the canonical versioned artifact. Pytest also guards import direction and imports the core without site packages; add new core modules under that coverage.

## Maintained code and strict checks

Root Ruff and Pyright configuration covers service source/tests, `apps/web/runner/harness.py`, AST-only host tests under `apps/web/tests/python` and the shared checker/fixtures under `scripts/quality/python`. Ruff retains its defaults and adds `ANN`, `B`, `I`, `UP` and `SIM`. Pyright checks all these paths in strict mode, including typed fixtures and fakes. No maintained path is excluded or globally weakened for a dynamic dependency.

Declare parameter and return annotations, parameterize collections, and narrow unknown values at validation boundaries. Prefer `object`, typed models and small `Protocol` interfaces over propagating `Any`. Unavoidable exceptions need an exact-line, rule-specific Ruff or Pyright suppression and a reason; Pyright rejects stale ignores and ignores generic `type: ignore` comments. Keep untyped SDK behavior inside its adapter. Runtime validation must enforce exact types and bounds rather than relying on static annotations or coercion.

Use `test_should_<outcome>_when_<condition>` for pytest functions and meaningful setup/execution/assertion paragraphs. Typed fakes keep provider tests deterministic and offline. Host pytest may parse and inspect synthetic Python ASTs; it must never execute learner submissions or generated solutions. Actual challenge execution belongs only to the isolated browser runner. Do not put private code/material in fixtures, logs, snapshots or evals.

Follow the playbook's [Python parameter layout](https://github.com/brayan/engineering-playbook/blob/1f005f7777c619ec0db7f6421ca5df656c3345fe/docs/engineering/python-parameter-layout.md): definitions with two or more declared parameters put each on a new line, with the closing parenthesis on a separate line and a trailing comma. Count `self`/`cls`, keyword-only and variadic parameters. Calls and lambdas are outside this rule. The committed shared checker under `scripts/quality/python` runs in `python:lint`, so `python:check` and the existing Python GitHub Actions job reject violations. Ruff preserves the layout through magic trailing commas. See the [local provenance and update instructions](../../scripts/quality/python/README.md).

## Commands

| Command | Scope |
|---|---|
| `pnpm python:sync` | Frozen uv workspace install, including development tools. |
| `pnpm python:lint` | Ruff and deterministic definition-parameter layout checks over maintained Python. |
| `pnpm python:format:check` | Read-only Ruff formatting check over the same paths. |
| `pnpm python:typecheck` | Strict Pyright over maintained source and tests. |
| `pnpm python:test` | Offline pytest: service behavior, safe harness AST checks and shared parameter-layout fixtures. |
| `pnpm python:check` | Lint, formatting, strict types, then pytest. |

These use the same locked environment locally and in [CI](continuous-integration.md). Perform contextual self-review before running checks; formatter success does not prove paragraph quality. Service/host tests cannot establish isolation or generation quality. Real Chrome checks establish browser behavior; paid quality evaluation is separate and requires an explicit model and remaining budget.
