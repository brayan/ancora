# Testing Strategy

Use narrow checks and synthetic code. The current implementation retires auth/sources/cards and proves the browser execution boundary; persistence and model generation remain later slices.

| Command | Evidence |
|---|---|
| pnpm web:lint | Naming conventions and ESLint for app/static delivery. |
| pnpm web:typecheck | TypeScript contracts and UI/browser tests. |
| pnpm web:test | Runner protocol limits/bindings and preserved historical migration checks. |
| pnpm web:test:browser | Installed Google Chrome: real Pyodide execution, UI states, Stop/timeout/output/reset, mutation/technique, stale messages, network canary, static server and retired-route checks. |
| pnpm packages:typecheck | Shared packages. |
| pnpm repo:test:context | Governance presence/language only. |
| pnpm repo:test:task | Existing static/unit/eval scaffold completion lane. |
| pnpm repo:test:pr | Context + task lanes; run browser suite separately for this change. |

The browser config starts distinct loopback application and runner origins, without reusing existing servers. Install dependencies with `pnpm install --frozen-lockfile`; Google Chrome must be installed. Chrome screenshots in ignored test-results contain only the fixed synthetic exercise. Traces/videos are off so future private code is not captured by default.

No live LLM calls or real database are used. Historical SQL checks protect retained migration invariants; they do not claim the retired product remains active. No Vitest or Python-service test commands exist. Ruff, strict Pyright, pytest and canonical cross-language contract generation belong to the later service slice. The TypeScript eval CLI still returns an empty scaffold result, not challenge quality evidence.

Future tests: revision immutability, draft reload/resume, provider correction budget across retry layers, pending/interrupted generation, learner-view omission of references/cases, optional assistance and privacy-safe telemetry. See docs/architecture/runner-spike.md for measured limitations.
