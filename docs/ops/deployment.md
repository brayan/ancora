# Local Operation

Ancora supports local single-user operation. [The README](../../README.md#local-startup) owns frozen setup, migration and startup commands. `pnpm dev` starts Next.js at `127.0.0.1:3000`, the static runner at `127.0.0.1:3001` and FastAPI at `127.0.0.1:8001`. Use the exact application hostname; no login is required. Public/LAN exposure needs a reviewed deployment/authentication design.

PostgreSQL/Drizzle are required for durable practice, including the fixed exercise. The practice Compose project uses its own volume and loopback port 5433. Preserve legacy containers/volumes. Export an explicit `DATABASE_URL`, review its history and run `pnpm db:migrate` before startup. Startup never migrates. Do not use schema push/diff generation or reset a database. See [migration ownership](../architecture/practice-persistence.md).

Fixed practice and solution reveal need no provider credentials. Generation, hints and coaching require explicit Python-side enablement, model/key and a trusted server token shared with Next.js. The launcher passes provider settings only to Python and strips them from Next.js; the runner receives an allowlist without database/provider credentials. Python settings come from the shell, not automatically loaded dotenv files. See [backend environment](../../backend/README.md).

Stop local servers before browser checks; tests refuse existing listeners. `pnpm docker:down` stops the practice database without deleting its volume. [Offline wrappers](../testing/testing-strategy.md) use new tmpfs containers and synthetic providers, never an existing database or live credentials. [V1 completion](../testing/v1-completion.md) records setup evidence and limits.
