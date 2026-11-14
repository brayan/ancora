import 'server-only';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getDatabaseUrl } from '@/server/env';
import * as schema from '@/server/db/schema';

const globalForDatabase = globalThis as typeof globalThis & {
  ancoraDatabasePool?: Pool;
};

const pool =
  globalForDatabase.ancoraDatabasePool ??
  new Pool({
    connectionString: getDatabaseUrl(),
  });

if (pool.listenerCount('error') === 0) {
  pool.on('error', () => {
    // Idle connection failures must not terminate the app or log private query context.
    console.error('practice_database_connection_unavailable');
  });
}

if (process.env.NODE_ENV !== 'production') {
  globalForDatabase.ancoraDatabasePool = pool;
}

export const db = drizzle(pool, { schema });
