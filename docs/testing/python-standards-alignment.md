# Python standards alignment evidence

Verified locally on 2026-11-17 in a new worktree from main `dd4d5d842e30239c3262f0e4c59af6fd3ae88d39`, branch `chore/python-standards-alignment`. Environment: macOS, Node `26.0.0`, pnpm `10.8.0`, uv `0.11.18`, Python `3.13.13`, Google Chrome `157.0.8103.79` and Playwright `1.65.0`.

The [final combined results](#capability-layout-and-final-combined-verification) below supersede the earlier phase's counts after the capability layout refactor.

## Scope and review

The root workspace installs the reviewed `sailtech-python-checks` wheel `0.9.5`, including its compatible Tach extra. [Artifact provenance](../../config/quality/python/README.md) records immutable source and SHA-256. Copied checker implementations/fixtures were removed; all existing enabled layout rules remain enforced alongside ordering, suppression rejection and the shared domain-import guard. Ruff adds shared naming, unused-argument and size rules without disabling existing checks. Pyright remains strict.

Source/tests follow dependency-aware ordering while retaining positional signatures/dataclass fields. Effectful keyword arguments are computed in their original order. An AST comparison identified function-body changes beyond keyword ordering for focused review: mapper argument preparation, provider setup, environment reads, intentional argument discards and the runner refactor. Contract/schema checks passed without regenerating artifacts. Domain/application remain framework-free; the exact first-party graph is unchanged.

At the owner's request, the runner boundary was refactored to remove both former suppression comments. The browser's Pyodide adapter executes source and catches Python exceptions. Python retains preflight, case checking, partial evidence and bounded report formatting. No host execution path or privileged helper was added; source/case bindings, wire protocol, deadlines, Stop, output caps and separate static origin remain in place. See [runner architecture and limits](../architecture/runner-spike.md).

## Final validation

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile`; `pnpm python:sync` | Fresh worktree setup passed; only the reviewed policy development package was added. |
| `UV_OFFLINE=1 pnpm python:check` | Ruff, four packaged layout/ordering checks, formatting of 80 maintained files, strict Pyright, exact Tach graph, shared domain guard and **205 pytest cases passed**. |
| `pnpm repo:test:pr` | Context/governance, code/format conventions, contracts, shared/web/eval TypeScript, Compose, 8 config fixtures, 20 quality/runner fixtures, 33 web unit cases, 48 disposable-PostgreSQL cases and 1 eval-scaffold case passed. |
| `UV_OFFLINE=1 pnpm web:test:browser` | **60/60 passed** in installed Google Chrome, no retries, 3.8 minutes. Includes all 23 runner cases. |
| `bash -n scripts/ci/run-python-checks.sh`; `git diff --check` | Passed. |

The Python count excludes 37 formerly copied upstream checker cases and adds downstream integration coverage. Product behavior/contract tests remain. Upstream package results are recorded separately in provenance and are not counted as Ancora tests.

New wrapper regressions verify frozen commands, exact scan paths, repository-root handling, bytecode settings and fail-closed propagation at every stage, including a caller shell conditional. Installed-artifact checks compare wheel hashes, module bytes and all five CLI versions. Import regressions cover direct/from/`TYPE_CHECKING` third-party domain imports without executing scanned source, while preserving application purity and whole-core imports without site packages.

New Chrome cases cover parse/compile/module/case failures, `SystemExit`, `KeyboardInterrupt`, custom base exceptions, partial results, message caps, error-formatting failures and successful subsequent runs. Existing UI/reload, assistance, timeout/Stop/output, contamination, mutation/technique, stale-message, network-canary and action-message tests passed. Three bounded-allocation probes loaded fresh workers in 1,178 / 1,070 / 1,048 ms; these are local samples, not a percentile or memory quota.

## Limits

All inputs/providers were synthetic. Tests used disposable databases, never existing databases/volumes. Retained migrations, prompts, canonical wire artifacts, runtime dependency versions and provider settings have no changes. No live quality evaluation or paid provider calls ran. CI inherits the same entry points and remains provider-free; this local result does not claim a hosted Actions run. Existing runner memory/attestation limits and separately deferred coaching quality evaluation remain.

## Follow-up script verification — 2026-11-17

Reran all three current CI lanes against the uncommitted worktree: `pnpm repo:test:pr` passed, `UV_OFFLINE=1 pnpm python:check` passed all 205 cases, and `UV_OFFLINE=1 pnpm web:test:browser` passed all 60 cases with no retries in 3.7 minutes. The lanes inspect working files, including new files; they are not commit-range-only baseline checks.

The extra `pnpm --filter @ancora/web build` initially refused the documented missing `DATABASE_URL` prerequisite. After reviewing the retained journal, `pnpm db:migrate` and the production build passed using a fresh tmpfs PostgreSQL container with random loopback credentials/port. That container was removed. No existing database/volume or provider was used; no code fix was needed.

Compared [Lumera's quality runner at Sailtech `4dea6fa8595e2210d29b8e16d73f56b37210e463`](https://github.com/brayan/sailtech/blob/4dea6fa8595e2210d29b8e16d73f56b37210e463/scripts/ci/suites/python/run-python-quality.sh). Both integrations invoke the same five installed policy commands, Ruff, strict Pyright, exact Tach and pytest. All files inside the two `0.9.5` wheels match; their archive hashes differ. Lumera uses a separate tooling environment for multiple applications; Ancora uses its root development workspace. Lumera additionally generates coverage/JUnit reports and runs dependency auditing, which are not configured Ancora checks and were not added by this verification.

Verified the constructor scope directly with synthetic source: unsorted positional parameters pass ordering; unsorted keyword-only parameters fail `PYORD002`. This is the shared rule's defined scope, not proof that all constructor parameters are alphabetical. See [the local convention](../engineering/python-conventions.md#maintained-code). This verification clarified documentation without changing constructor APIs or adding a policy exception.

## Capability layout and final combined verification

[ADR 0017](../adr/0017-organize-python-api-by-capability.md) records the subsequent owner-requested Lumera alignment. Root API/config remain separate from `challenges`, `hints` and `coaching`, each owning its plain domain/application and AI infrastructure. HTTP dependency accessors and unavailable providers now belong to their capability. Only the common provider-interruption error is shared. Imports, prompt-file locations, exact Tach edges/public interfaces and nested-core discovery were updated together. No dependencies, migrations, prompts, wire artifacts or constructor contracts changed during this layout refactor.

Source comparison confirmed 90 business-function bodies unchanged after normalizing owned import paths. The expanded architecture regressions cover every nested domain, application/core discovery and forbidden cross-feature application/adapter access.

- `UV_OFFLINE=1 pnpm python:check`: passed Ruff, all packaged rules, 103 formatted files, strict Pyright, exact Tach/domain guards and **214 pytest cases**.
- `pnpm repo:test:pr`: passed context/conventions/contracts/types, 8 config cases, 20 quality/runner cases, 33 web unit cases, 48 disposable-PostgreSQL cases and the eval scaffold.
- `pnpm code:check` and `pnpm web:typecheck`: passed again after the browser-test correction below.
- `UV_OFFLINE=1 pnpm web:test:browser`: final **60/60 passed**, no retries, 3.7 minutes in installed Google Chrome with synthetic providers/disposable PostgreSQL.
- Context, relative documentation links and staged whitespace checks passed after the final documentation update.

The first combined Chrome run stopped at coaching keyboard confirmation (5 passed, 1 failed). Its dialog stayed open before a request was sent. Inspection found that the test focused the Share button before the component's scheduled panel-focus callback could finish; an isolated unchanged rerun passed. The test now waits for intended panel focus and uses Tab/Enter, preserving the product interaction instead of adding sleeps, increasing timeouts or enabling retries. The final full suite passed with that correction; no product UI behavior changed.

Review order: ADR 0017 and `tach.toml`; nested architecture regressions; capability moves/mappings/bootstrap; browser runner adapter/harness and keyboard regression; packaged policy artifact/wrapper/provenance. The standards, runner suppression removal and capability layout remain in one owner-requested PR. Alphabetical keyword-only constructor migration remains a separate proposal.
