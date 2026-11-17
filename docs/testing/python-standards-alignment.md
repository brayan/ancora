# Python standards alignment evidence

This dated report retains paths at its tested commits. Current project placement and operation names follow [ADR 0018](../adr/0018-place-projects-at-root-and-use-operation-use-cases.md); see [root-layout verification](root-layout-use-cases.md) for the subsequent refactor.

Verified locally on 2026-11-17 in a new worktree from main `dd4d5d842e30239c3262f0e4c59af6fd3ae88d39`, branch `chore/python-standards-alignment`. Environment: macOS, Node `26.0.0`, pnpm `10.8.0`, uv `0.11.18`, Python `3.13.13`, Google Chrome `157.0.8103.79` and Playwright `1.65.0`.

The [combined results](#capability-layout-and-final-combined-verification) supersede the earlier phase's counts after the capability layout refactor. The alias and compact-configuration follow-ups record earlier package upgrades; [merged playbook adoption](#merged-playbook-adoption--2026-11-17) records the current pin.

## Scope and review

The root workspace installs `sailtech-python-checks` with its compatible Tach extra, initially `0.9.5` and now `0.10.3` from the merged playbook. [Artifact provenance](../../config/quality/python/README.md) records immutable source and SHA-256. Copied checker implementations/fixtures were removed; all existing enabled layout rules remain enforced alongside ordering, suppression rejection and the shared domain-import guard. Ruff adds shared naming, unused-argument and size rules without disabling existing checks. Pyright remains strict.

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

## Shared type alias policy — 2026-11-17

The locked development package is now `sailtech-python-checks` **0.10.0**, built from engineering-playbook commit [`db85bd54d0a4cfb12755835305315a7d53530152`](https://github.com/brayan/engineering-playbook/commit/db85bd54d0a4cfb12755835305315a7d53530152), published on `feat/python-type-alias-ordering`. Independent worktree/archive builds were byte-identical; provenance and `uv.lock` pin SHA-256 `288b291f2a597120f340d0f0dfc19f510825aa3c8bfb82a9175bdcb1da04a4d3`.

The existing ordering command adds `PYORD011` for dependency-safe module alias groups and `PYORD012` for cohesive alias spacing. It reuses the original definition-time dependency graph and respects statement barriers and bindings. Groups stay intact after required getters/classes; standalone section comments permit a single blank separator. The package checks source without executing it or rewriting declarations.

Shared-package validation passed Ruff/formatting, strict Pyright, all layout/ordering commands and **324 pytest cases plus 132 subtests**, including 30 new placement/spacing regressions. Those fixtures remain upstream. Ancora's existing installed-artifact tests verify the new hash, installed module bytes, five CLI versions and wrapper wiring.

A preview found three spacing violations in the generation, hint and coaching dependency modules, with no placement violations. Removing only the blank gaps keeps their prerequisite getters in place; AST comparisons confirmed all three modules unchanged. No runtime dependencies, positional APIs, prompts, schemas or migrations changed.

- `pnpm python:sync`: frozen installation of the new local artifact passed.
- `UV_OFFLINE=1 pnpm python:check`: passed all packaged checks, Ruff/formatting, strict Pyright, exact Tach/domain guards and **214 pytest cases**.
- `pnpm repo:test:pr`: passed context/conventions/contracts/types, 8 config cases, 20 quality/runner cases, 33 web unit cases, 48 disposable-PostgreSQL cases and 1 eval-scaffold case.

The preceding **60/60 Chrome result** remains runtime evidence for the earlier combined refactor; Chrome was not rerun for this development-policy and AST-identical whitespace follow-up. CI uses the same installed checker and remains offline. No provider calls ran.

## Compact model configuration — 2026-11-17

The locked development artifact is now **0.10.1** from [engineering-playbook commit `ee14579643fb0c5e9779731a8d117f3509b8c5e8`](https://github.com/brayan/engineering-playbook/commit/ee14579643fb0c5e9779731a8d117f3509b8c5e8). Two isolated builds from that immutable archive were byte-identical, with SHA-256 `b01ffe3091080e4b85ef57859de0ba0a21115e1582e77e176c6b19a41a07fdb9` recorded in provenance and the lockfile.

`PYORD005` permits zero or one blank line after a single-line class `model_config` before an annotated instance field. Multiline configuration and other declaration-kind transitions still require one separator. The rule uses existing syntactic roles without framework imports or inheritance inference; no suppression or local opt-out was added.

Ancora removes four blank gaps in `ApiErrorResponse`, `DraftInvalidResponse`, `GenerationStatus` and `HintDraft`. The old package reported four `PYORD005` violations against those exact edits; the updated package accepts them. All three affected module ASTs are identical. Runtime dependencies, model fields/validation, canonical contracts, prompts and migrations are unchanged.

Upstream local checks passed **340 package tests**, including 16 new configuration-spacing cases; **410 skill-helper tests**, **215 Kotlin tests** and installer fixtures; **81 Markdown files** and **7 documentation integration cases**. Actionlint and shell syntax passed. The upstream commit adds its own push/PR workflow for documentation, Python `3.10`/`3.13` and existing script fixtures; those are playbook checks, separate from Ancora's CI and test counts. Fixtures remain upstream.

The [first hosted playbook run](https://github.com/brayan/engineering-playbook/actions/runs/44132680936) passed all four jobs at that exact source commit: Documentation, Python package (`3.10`), Python package (`3.13`), and Kotlin/skill fixtures.

- `pnpm python:sync`: frozen installation of the `0.10.1` artifact passed.
- `UV_OFFLINE=1 pnpm python:check`: passed all enabled policy checks, Ruff/formatting, strict Pyright, exact Tach/domain guards and **214 pytest cases**.
- `pnpm repo:test:pr`: passed context/conventions/contracts/types, 8 config cases, 20 quality/runner cases, 33 web unit cases, 48 disposable-PostgreSQL cases and 1 eval-scaffold case.
- Relative documentation links, three module AST comparisons, the artifact digest and whitespace checks passed.

No local Chrome rerun was added for this development-tool and AST-identical whitespace change. The preceding runtime evidence remains identified above; automatic CI still runs its browser lane for published changes. No provider calls ran, and CI remains provider-free.

## Merged playbook adoption — 2026-11-17

The current pin is **0.10.3** from merged [playbook PR #28](https://github.com/brayan/engineering-playbook/pull/28), mainline commit [`b524f009fcbb9be7c0d488d9fe336f6c5c094581`](https://github.com/brayan/engineering-playbook/commit/b524f009fcbb9be7c0d488d9fe336f6c5c094581). The two review fixes preserve reads of enclosing/control-flow bindings before alias reassignments, including defaults, annotations and class bases, at module scope and inside conditional suites. The compact `model_config` exception remains enabled.

The exported merged source passed its lint/format/layout checks, strict Pyright and **359 pytest cases**, including **19 new binding-preservation regressions**. Two independent archive builds were byte-identical, with SHA-256 `53d00d3463fbb8c93f0c9f99066c3f6c0f247d0ee640ea766873ca1fc67e71d6`. Regression fixtures remain upstream; Ancora tests the installed artifact and command wiring. This follow-up changes development-policy provenance, the lock and documentation; maintained application/runner sources match the preceding commit.

The [merged mainline workflow](https://github.com/brayan/engineering-playbook/actions/runs/44146054983) passed all four jobs at that source commit. Ancora's frozen `pnpm python:sync`, offline `pnpm python:check` (**214 cases**) and `pnpm repo:test:pr` passed, including 8 config, 20 quality/runner, 33 web unit, 48 disposable-PostgreSQL and 1 eval-scaffold case. Relative documentation links, wheel digest, runtime-source equality and whitespace checks passed. Browser validation remains in the automatic CI lane for the published head; no live provider calls ran.

### Browser request tracking correction

The first CI run for `2e8814d` stopped after 10 passes at the strings-generation network assertion, which recorded four pending coaching/attempt GETs as failures during a reload flow. A separate synthetic probe in installed Google Chrome confirmed that deliberate reload cancels pending reads with `net::ERR_ABORTED`; the old assertion treated those events as unconditional failures.

The generation test now snapshots active GET request identities immediately before its explicit reload. Only those requests with the exact navigation-abort error are accepted. New requests, connection failures, missing error details and canceled writes remain reported, with diagnostic method/error information. Seven deterministic unit regressions cover those boundaries; no sleeps, retries, broader error filtering or product-code changes were introduced. Console-error assertions remain enabled.

`pnpm code:check`, `pnpm web:typecheck` and **40 web unit cases** passed, including the seven new tracker cases. The final local `UV_OFFLINE=1 pnpm web:test:browser` run passed **60/60** in installed Google Chrome, without retries, in 4.8 minutes. It covered the original failing generation flow, desktop/mobile synthetic views, reload/resume and all runner capability checks.
