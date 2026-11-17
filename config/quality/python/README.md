# Shared Python policy artifact

Ancora installs `sailtech-python-checks[architecture]==0.10.0` as a root uv development dependency. The committed wheel replaces the former copied scripts and fixtures under `scripts/quality/python`. It is not an application runtime dependency.

The machine-readable [provenance](provenance.json) records:

- Source: [engineering-playbook at `db85bd54d0a4cfb12755835305315a7d53530152`](https://github.com/brayan/engineering-playbook/tree/db85bd54d0a4cfb12755835305315a7d53530152/scripts/python-conventions).
- Upstream validation: Ruff/formatting, strict Pyright, all installed layout/order checks, 324 tests and 132 subtests passed for the source commit. These are shared-package results, not Ancora test counts. Source is published on [feat/python-type-alias-ordering](https://github.com/brayan/engineering-playbook/tree/feat/python-type-alias-ordering).
- Wheel: `sailtech_python_checks-0.10.0-py3-none-any.whl`.
- SHA-256: `288b291f2a597120f340d0f0dfc19f510825aa3c8bfb82a9175bdcb1da04a4d3`.

Independent builds from the clean committed worktree and its immutable source archive with Hatchling `1.33.0` produced byte-identical wheels. The artifact hash is also locked in `uv.lock`. Ancora's offline artifact test verifies installed module bytes against this wheel; CLI tests check all five command versions. Shared implementation/behavior fixtures remain upstream.

## Consumption

`pnpm python:sync` installs the locked local wheel. `scripts/ci/run-python-checks.sh` calls the installed parameter, condition, class-spacing and ordering commands over `apps/api`, `apps/web/runner/harness.py` and `apps/web/tests/python`. Architecture checks run both `tach check --exact` and the shared domain guard over `apps/api/src`. The `architecture` extra uses the existing locked Tach `0.35.3` backend. Ordering also enforces `PYORD011` dependency-safe module alias groups and `PYORD012` cohesive spacing. Ancora’s dependency aliases stay after the getters they require, without unnecessary blank lines.

All commands are read-only and offline after dependency installation. They parse scanned source without importing/executing it. Exit 0 means compliant, 1 means violations and 2 means invalid input/backend failure. CI uses the same wrapper; it never builds or downloads checker source, reads a sibling checkout or invokes providers. Ancora's runner contract tests substitute `uv` to verify exact commands, scopes, root-directory handling and failure propagation.

## Deliberate upgrades

1. Review the upstream commit, rule changes, package tests and compatible Tach range. Preserve existing enabled layout rules.
2. Export that immutable commit and build the wheel twice with the reviewed build backend. Compare bytes and record the version, source revision, wheel hash and upstream evidence here and in `provenance.json`.
3. Replace the artifact and update the root dependency/source together. Run `uv lock` intentionally, then frozen sync; do not add a branch URL or runtime source download.
4. Run downstream artifact/orchestration tests, `pnpm python:check` and relevant contract/browser checks. Review positional APIs, framework dependencies and evaluation order separately from alphabetical checks. Remove the superseded wheel.

See [Python conventions](../../../docs/engineering/python-conventions.md) for policy scope. Do not maintain a second checker implementation or copy upstream fixtures into Ancora.
