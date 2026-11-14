# Ancora Web

Next.js App Router/React/TypeScript programming workspace. `app/` is thin delivery, `features/programming-practice/` owns UI and job orchestration, `runner/` owns the static execution broker/worker/protocol, and `server/db/` is reserved for later PostgreSQL/Drizzle models.

From the root, `pnpm dev` starts 127.0.0.1:3000 and the separate 127.0.0.1:3001 runner origin. No credentials/database are needed. Fixed synthetic exercises only; drafts/attempts are not persisted yet. A textarea is deliberate for the spike; editor-package selection belongs to the fixed-exercise slice.

Commands: `pnpm web:lint`, `pnpm web:typecheck`, `pnpm web:test`, `pnpm web:test:browser` (installed Google Chrome). Historical migrations/snapshots are unchanged; database generation/application is paused pending schema transition review. No auth/source/card runtime remains.

See ../../docs/adr/0011-focus-on-local-programming-practice.md and ../../docs/architecture/runner-spike.md.
