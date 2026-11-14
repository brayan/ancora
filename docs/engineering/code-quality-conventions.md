# Code Quality Conventions

Ancora adopts Sailtech's Next.js naming, feature ownership and file-size policies, plus the engineering playbook's [code paragraph spacing](https://github.com/brayan/engineering-playbook/blob/main/docs/engineering/code-paragraph-spacing.md) and [test naming](https://github.com/brayan/engineering-playbook/blob/main/docs/testing/test-naming-convention.md). This document owns the local enforcement and adaptations. ADR 0011 continues to own product/runtime boundaries.

## Readability

Use braces for every JavaScript/TypeScript control-flow body, including single-line early returns and loops. Ancora deliberately requires more than Sailtech's early-return-only guard, as requested by the owner. ESLint's `curly: all` enforces this using the syntax tree and can fix missing braces.

Use one blank line when a function changes responsibility: for example, validate a message, prepare a runtime, execute, then publish a report. Keep short, cohesive operations together. Declarations and returns do not automatically require a blank line. Review this context in touched application code, scripts and tests; do not insert a blank line after every statement or add a generic padding rule. Prettier preserves paragraph breaks but cannot judge whether they express the right stages. ESLint rejects repeated empty lines.

Extract a direct multiline predicate call into a named boolean before an `if`. Mixed boolean expressions and single-line calls are allowed. Static TS/JS test titles use `should <outcome> when <condition>`; group test setup, execution and assertions into meaningful paragraphs without mechanical AAA comments.

Prettier uses Sailtech's settings: single quotes, semicolons, ES5 trailing commas and a 100-column print width. It formats TS/JS and CSS under `apps/web`, `packages`, `scripts` and `tools`, plus the root ESLint config. Generated files and historical database migrations are excluded. Python harness paragraphs receive contextual review; Python service and harness checks follow [Python conventions](python-conventions.md).

## File roles and ownership

Follow [Next.js naming](../frontend/nextjs-naming-convention.md) and [feature-first structure](../frontend/nextjs-feature-first-convention.md): PascalCase component files matching their exports, camelCase `use` hooks matching their exports, lowercase contract filenames, reserved App Router names and camelCase dynamic parameters.

The portable filename CLI lives in `packages/config/bin`. App-local guards enforce directional imports and follow local module imports through barrels to reject client access to server-only modules. They recognize literal alias/relative imports, re-exports, dynamic imports and requires; they are policy checks, not a complete compiler or security boundary.

`app/` contains App Router contract files. No top-level web `src/`, `sections`, Clean Architecture or MVVM layers. Product environment reads belong under `server/`. Generic `lib/` remains client-safe. Server clients belong under `server/clients/`; the existing Drizzle client stays under `server/db/`. Console-specific authentication and telemetry exceptions are not carried into Ancora.

The same Sailtech line budgets apply: 150 for route entries, 220 for API route files, 450 for feature components and 700 for other product modules. Tests, declarations and generated files are excluded. Exceptions, if ever needed, must include a reason in `config/quality/typescript-size-guardrails-allowlist.txt`; malformed, duplicate and stale entries fail. No exceptions are currently needed. Do not split a cohesive function merely to satisfy a metric; review its responsibilities first.

## Commands and validation

| Command | Purpose |
|---|---|
| `pnpm code:check` | Web naming/import/architecture/size checks, ESLint for web/shared/scripts/tools, and formatting. |
| `pnpm format:check` | Read-only formatter check. |
| `pnpm format:write` | Format supported source files; review the diff afterward. |
| `pnpm quality:test` | Positive/negative fixtures for naming, braces, predicate extraction, test names, imports, architecture and size limits. |
| `pnpm web:lint` | Web naming/import/architecture/size checks and ESLint. |

Fast blockers run `code:check` before typechecks. The task/PR lanes also run `quality:test`. Browser regression checks remain separate for runner/UI changes. Passing guards does not replace task-owned self-review of names, responsibilities and paragraph grouping.

## Upstream provenance and updates

The baseline is [Sailtech commit e2a6ce0](https://github.com/brayan/sailtech/tree/e2a6ce059ac53e4f57f17db14dd6521e3061585b):

- `libs/typescript/web/config/bin/check-next-filenames.mjs` and its fixture tests.
- `apps/console/web/scripts/check-import-boundaries.mjs`.
- `apps/console/web/scripts/check-architecture-policy.mjs`.
- `apps/console/web/scripts/check-typescript-size-guardrails.mjs`.
- `.prettierrc.json` and the conditional-call/test-title policies.

Ancora keeps adapted scripts locally because the playbook currently has no distributable TS/JS convention CLI. It does not depend on a sibling checkout or download policy code during CI. To refresh, compare these named upstream files, review changes against Ancora's architecture, update the provenance and fixture tests, then run the owning checks. Do not copy Console-specific providers, routes, exceptions or services.
