# Programming Practice Execution Plan

## Goal and authorization

Ancora's local single-user programming-practice loop is implemented under ADRs 0011–0016. PRs #7–#12 delivered the pivot/runner, persistence, generation/CI, solution reveal, progressive hints and selected-attempt coaching. Next.js/React/TypeScript, FastAPI/Pydantic AI and PostgreSQL/Drizzle remain the accepted stack.

The owner authorized v1 completion from latest `main`: reconcile current documentation, verify setup and migration upgrades on disposable databases, run complete offline and Google Chrome checks, and fix issues found. Live coaching evaluation is explicitly deferred. Earlier generation/hint budgets do not authorize new calls.

## Implemented capabilities

| Capability | Owning documentation |
|---|---|
| Local product scope and retired features | [ADR 0011](../adr/0011-focus-on-local-programming-practice.md) |
| Dedicated-origin disposable execution | [Runner boundary and original measurements](../architecture/runner-spike.md) |
| Immutable revisions, saved drafts/attempts, reload/resume | [Persistence and migration history](../architecture/practice-persistence.md) |
| Generated challenges, reference validation and explicit correction | [Generation lifecycle](../architecture/challenge-generation.md) |
| Confirmed reveal and assistance snapshots | [Practice assistance](../architecture/practice-assistance.md) |
| Progressive hints and bounded retries | [Progressive hints](../architecture/progressive-hints.md) |
| Coaching with explicit saved-code sharing | [Coaching lifecycle](../architecture/selected-attempt-coaching.md) |
| Shared conventions, Python layers and offline CI | [Python conventions](../engineering/python-conventions.md) and [CI](../engineering/continuous-integration.md) |

## V1 completion

1. Align product, architecture, operations, eval, roadmap and agent navigation with implemented capabilities. Preserve ADR history and label earlier slice evidence.
2. Install frozen pnpm/uv workspaces in a fresh worktree. Review retained migrations before exercising the real migration command on a fresh disposable database, including idempotent reapplication.
3. Run `pnpm repo:test:pr`, `pnpm python:check` and `pnpm web:test:browser`. Verify fresh/known-legacy and 0006–0009 upgrades, immutable records and assistance preservation. Use only synthetic providers/data and disposable PostgreSQL.
4. Exercise local startup and the practice UI in installed Google Chrome. Check reload/resume, execution recovery, keyboard/focus and desktop/mobile layout; inspect normal-flow console/network failures.
5. Fix findings within accepted boundaries, add meaningful regressions for behavior changes and rerun affected checks. Record results and remaining limits in [v1 completion evidence](../testing/v1-completion.md).

## Completion and limits

The completion pass verified fresh setup, repeated migrations, the production build, full offline/Chrome checks and ordinary local startup. [V1 completion evidence](../testing/v1-completion.md) records the exact scope and local environment. Historical assistance preservation now has populated upgrade fixtures.

[The testing strategy](../testing/testing-strategy.md) distinguishes governance, software behavior, browser isolation and model quality. Empty eval smoke cannot establish challenge/coaching quality. Assistance remains separate from behavioral/technique verdicts.

Preserve original dirty checkouts, retained SQL/snapshots/journal entries and existing volumes. Do not run schema push, destructive diff generation, resets or migrations against an existing database for this task. Python does not own database writes or execute solutions. No new product scope, runtime dependency or migration is planned.

Publication requires a separate request. Revert only task-owned changes if needed; do not reset another worktree or delete data. Future improvements remain [roadmap proposals](../roadmap/next-improvements.md).
