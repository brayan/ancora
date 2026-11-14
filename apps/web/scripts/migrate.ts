import { Pool } from 'pg';
import { fileURLToPath } from 'node:url';
import { migratePracticeDatabase } from '../server/db/migrations';

if (!process.env.DATABASE_URL) {
  throw new Error('Set DATABASE_URL explicitly before running migrations.');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await migratePracticeDatabase(pool, fileURLToPath(new URL('../drizzle', import.meta.url)));
  process.stdout.write('Practice migrations completed.\n');
} catch {
  process.stderr.write(
    'Migration refused or failed. Review database connectivity and migration history.\n'
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
