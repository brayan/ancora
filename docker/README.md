# Docker

`docker-compose.practice.yml` owns the active local practice PostgreSQL instance: loopback port 5433, database `ancora_practice`, container `ancora-practice-postgres` and a separate named volume. `pnpm docker:up`, `pnpm docker:config` and `pnpm docker:down` use it. Down preserves its volume.

The original `docker-compose.yml` is retained for legacy database inspection and recovery. This slice does not start/reset its stopped container or remove its volume. Never use `down -v` or database reset as part of migration.

The test wrapper creates a uniquely named disposable PostgreSQL container with tmpfs and a random loopback port; it stops only that container. The project image must be available locally. No existing DATABASE_URL or volume is used by database/browser test commands.

See [migration review and contract](../docs/architecture/practice-persistence.md) and [startup](../README.md).
