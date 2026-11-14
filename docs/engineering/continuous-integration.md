# Continuous integration

`.github/workflows/checks.yml` runs on pull requests, pushes to `main` and manual dispatch. It uses `contents: read`, disables checkout credential persistence, cancels superseded runs per ref and pins third-party actions to commit SHAs. No provider secrets, deployment credentials or live model calls are configured. Fixtures and database contents are synthetic; the workflow uploads no code-bearing screenshots, traces, videos or logs as artifacts.

| Job | Local entry point | Evidence |
|---|---|---|
| Repository checks | `pnpm repo:test:pr` | Context, code conventions, contracts, TypeScript, unit tests, disposable PostgreSQL integration and offline eval smoke. |
| Google Chrome integration | `pnpm web:test:browser` | Real Chrome, separate web/runner origins, synthetic service provider and disposable PostgreSQL. |
| Python quality and tests | `pnpm python:sync` then `pnpm python:check` | Frozen workspace, Ruff lint/format, strict Pyright and offline pytest. |

Node jobs install the `packageManager` version from `package.json` and run `pnpm install --frozen-lockfile`; Python jobs use uv `0.11.18`, Python `3.13` and `uv.lock`. Browser checks also install the frozen Python workspace for the synthetic service. Updating either dependency manifest requires its lockfile update. See [Python conventions](python-conventions.md) for maintained paths and strict typing policy.

Repository guard lanes require ripgrep (`rg`) locally. The repository job installs it explicitly from Ubuntu packages before invoking the lane; it does not rely on the hosted image including this tool.

Both database-using jobs explicitly pull `pgvector/pgvector:pg16` before invoking the local wrapper, which refuses a missing image. The wrapper creates fresh Docker containers with tmpfs storage and random loopback ports/credentials, applies retained additive migrations, then removes the containers. CI does not connect to an existing database or run schema push/diff generation.

Chrome installation uses `pnpm --filter @ancora/web exec playwright install --with-deps chrome`; Playwright selects `channel: 'chrome'`. The browser suite is separate from the PR lane and has no retries. Host pytest does not execute submitted/generated Python. Live generation evaluation is a separately authorized manual activity; it is never a CI gate.

Action inputs follow the upstream [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node), [pnpm setup](https://github.com/pnpm/action-setup) and [setup-uv](https://github.com/astral-sh/setup-uv) documentation. Browser installation follows [Playwright CI guidance](https://playwright.dev/docs/ci). Review upstream references and update pinned SHAs deliberately; a local check is not evidence that the workflow has executed on GitHub.
