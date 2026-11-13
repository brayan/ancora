# Change-Based Test Coverage Policy

Run the narrowest meaningful checks for the changed boundary. Read scripts before use and report missing prerequisites; do not invent passing commands.

- Docs/governance: file/link checks, manifest/shard inspection and `pnpm repo:test:context`.
- Web: naming preflight, `pnpm web:lint`, `pnpm web:typecheck`, `pnpm web:test`.
- Runner/UI: `pnpm web:test:browser` in actual Google Chrome, relevant desktop/mobile states, console/network checks and synthetic screenshots. Cover cancellation, failure recovery and capability negative paths.
- Future Python generation: typed fakes, structural/cross-field schemas, bounded provider attempts and synthetic evals. Tooling is not implemented yet.
- Persistence: review existing database/migration history before introducing a schema transition, then test repositories and lifecycle against disposable synthetic data.
- Scripts/CI: shell syntax/config checks and the owning lane. The context lane does not execute the runner; the empty eval scaffold does not establish model correctness.

Before broad checks, self-review the task-owned diff and run existing lightweight convention checks. `pnpm repo:test:pr` includes the local context/task lanes; browser checks are additional for runner changes. Report changed files, commands/results, validation gaps and residual risks. Do not log/capture private learner code.
