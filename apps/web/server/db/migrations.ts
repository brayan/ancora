import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import type { Pool } from 'pg';

// Reserved in the original checkout; its SQL is not applied by this product.
export const LEGACY_0005 = {
  hash: '3ff43f910ae3317d23e620d9fd0cb5330fbadcc47b6c5883a0faebf929002ddd',
  createdAt: 1787015660085,
};

export async function migratePracticeDatabase(pool: Pool, migrationsFolder: string) {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(664399201)');
    const migrations = readMigrationFiles({ migrationsFolder });
    const ledger = await client.query("SELECT to_regclass('drizzle.__drizzle_migrations') AS name");
    if (ledger.rows[0].name) {
      const applied = await client.query<{ hash: string; created_at: string }>(
        'SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at'
      );
      const known = new Map(migrations.map((entry) => [entry.hash, entry.folderMillis]));
      known.set(LEGACY_0005.hash, LEGACY_0005.createdAt);
      const observed = applied.rows.map((entry) => [entry.hash, Number(entry.created_at)] as const);
      if (
        observed.some(([hash, timestamp]) => known.get(hash) !== timestamp) ||
        new Set(observed.map(([hash]) => hash)).size !== observed.length
      ) {
        throw new Error('Unknown migration ledger; review the database history before migrating.');
      }

      // Drizzle skips everything before its last timestamp; verify that no retained step is missing.
      const last = observed.at(-1)?.[1] ?? 0;
      const missingMigration = migrations.some(
        (entry) => entry.folderMillis <= last && !observed.some(([hash]) => hash === entry.hash)
      );
      if (missingMigration) {
        throw new Error(
          'Incomplete migration ledger; review the database history before migrating.'
        );
      }
    } else {
      const existing = await client.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('accounts', 'users', 'sources', 'decks', 'cards', 'practice_challenges')"
      );
      if (existing.rowCount) {
        throw new Error(
          'Existing product tables have no migration ledger; manual review is required.'
        );
      }
    }

    await migrate(drizzle(client), { migrationsFolder });
  } finally {
    await client.query('SELECT pg_advisory_unlock(664399201)').catch(() => {});
    client.release();
  }
}
