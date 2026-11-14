# Challenge generation and CI

Owner authorized generation plus GitHub Actions on 2026-11-14, following merged PR #8. Implement on `feat/challenge-generation` from main `10af7c7`. ADR 0011 continues to own service, persistence and execution boundaries.

## Scope and review order

1. Versioned generation contracts: one pure Python function with one named argument; supported types are `int`, `str`, `list[int]`, `list[str]`, `dict[str,int]` and `dict[str,str]`. Integers exclude booleans, with magnitude at most 1,000,000; string values at most 2,000 UTF-16 units, dictionary keys at most 100 units and collections at most 100 entries. Case values in model output use bounded JSON strings, parsed and checked before execution. Signature/starter code derive from the structured function contract. Actual challenges are generated, not chosen from a bank.
2. FastAPI/Pydantic AI: typed generation and bounded structural validation, explicit OpenAI configuration, no database writer and no code execution. Each service request permits one provider call, with SDK/framework retries disabled. Synthetic fakes supply deterministic tests; no paid evaluation without a selected model and budget.
3. Next.js/PostgreSQL: additive migration after ledger review; durable generation requests, dispatch allowance, immutable candidate revisions, bound reference-validation jobs, explicit one-correction action, ready/rejected/interrupted states, and resumable pending validation. A browser report cannot authorize a paid correction. Uncertain calls consume their dispatch and are never silently repeated.
4. Browser runner: retain v1 fixed-exercise/attempt compatibility and add a versioned general function contract. Reference validation and learner execution remain isolated. Withheld material is inspectable by the machine's owner, and reports remain untrusted self-study evidence.
5. UI: choose concept/difficulty, generate, validate/resume, explicitly correct or open a ready exercise, and retain existing drafts. Failed or unfinished candidates never replace the active exercise. Existing fixed practice and old attempts remain accessible.
6. GitHub Actions: read-only permissions, locked installs, static/unit/database checks, real Google Chrome coverage, and Python Ruff/format/Pyright-strict/pytest checks. CI uses synthetic data and typed fakes, with no provider credentials or live calls. Local commands and CI share the same entry points.

## Python conventions

Adapt Sailtech `apps/platform/ops-agent/pyproject.toml` at `e2a6ce0` and the engineering playbook's Python typing/service, test naming/body, and contextual paragraph standards. Apply Ruff ANN/B/I/UP/SIM, strict Pyright over maintained source and tests, fully typed interfaces and fixtures, narrow justified dynamic boundaries, and locked tool versions. Keep HTTP thin, SDKs in adapters, deterministic rules independently testable, and create only needed packages.

## Ownership while implementing

- Root: shared generation contracts, Next.js durable lifecycle/migration/API/UI, browser integration tests and canonical product/architecture docs.
- CI leaf: GitHub workflows, root Python tooling/lockfile, top-level command wrappers and Python/CI convention docs. Coordinate dependency manifests before locking; do not mutate service source or runner behavior.
- Python leaf: `apps/practice-service`, versioned prompt and synthetic generation eval artifacts. Own service runtime dependency manifest; coordinate with the CI lockfile owner.
- Runner leaf: versioned runner protocol, Python harness/worker and focused runner tests. Preserve v1 and capability limits. Host pytest covers only safe AST/contract rules, never execution of submitted/generated code.

No overlapping file writes, Git/index operations or final validation while writers are active. Root integrates and verifies all claims. Preserve historical migrations, existing volumes, original dirty checkout, auth retirement and unrelated work.

## Acceptance

Cover genuinely varying generated function names/types; structural/example/reference contradictions; provider dispatch count and explicit correction exhaustion; stale reports; pending/rejected/interrupted recovery; retained drafts and revisions; safe learner projections; cross-origin/capability restrictions; and offline operation with typed fakes. Run convention preflight, focused Python/database and Chrome generation/persistence/runner checks, then the authorized live pilot and response review. Complete the integrated PR lane after the batch enters closure; paid quality evidence remains separate from CI.

## Live evaluation authorization

The owner selected `gpt-6-luna` and a hard USD 1 total budget on 2026-11-14. CI continues to use typed synthetic fakes with no API credentials or calls. A separate bounded pilot follows deterministic checks and an independently reviewed metadata-only budget guard; no paid retry is implicit. Live responses require review before quality acceptance.

## Current evidence

Publication scope is challenge generation and its CI checks on `feat/challenge-generation`, targeting `main` through a fresh draft PR as authorized on 2026-11-14. Final `pnpm repo:test:pr` and `pnpm python:check` passed on 2026-11-14: conventions/formatting, contracts, TypeScript, Docker configuration, 16 convention fixtures, 19 web unit cases, 22 disposable PostgreSQL cases, offline eval checks and 90 pytest cases with Ruff/format/strict Pyright. Chrome evidence covers seven generation cases and 29 persistence/runner cases, including per-tab selection and dictionary order. The owner accepted all three live samples on 2026-11-14. The implementation batch is complete; hosted Actions results belong to the published PR.

The manual pilot used seven gpt-6-luna calls, with no unknown outcomes. Conservative accounting is USD 0.026404 against USD 1, leaving USD 0.973596 unallocated; this is not an invoice. An initial dictionary-key bounds mismatch was fixed across the prompt/Python validator with regressions. A later invalid reference remained unavailable. The owner accepted the three final learner-facing samples: Select Safe Freezer Readings, Shift ASCII Letters Forward and Extract Negative Readings. Subsequent dictionary-order safeguards and JSONB case/report retention have synthetic database/browser regressions; the pilot alone does not establish those later changes. Private/reference code and live outputs were not added to fixtures or commits.

Review order: ADR 0013 and generation lifecycle; shared contracts and additive 0007; Python adapter/validation; runner v2; durable lifecycle/UI; CI and focused test evidence. Full generated history, coaching and broader language/type support remain deferred. The bounded selector preserves fixed and currently selected practice plus recent ready exercises, up to 20.
