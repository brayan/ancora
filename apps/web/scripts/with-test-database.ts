import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { migratePracticeDatabase } from '../server/db/migrations';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const name = `ancora-practice-test-${randomUUID()}`;
const password = randomUUID();
const mode = process.argv[2];
if (!['db', 'browser'].includes(mode)) {
  throw new Error('Choose db or browser tests.');
}

let container: string | null = null;
let child: ReturnType<typeof spawn> | null = null;
let pool: Pool | null = null;
const stop = () => {
  child?.kill('SIGTERM');
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

try {
  // No existing container or volume is used. The pinned project image must already be available.
  execFileSync('docker', ['image', 'inspect', 'pgvector/pgvector:pg16'], { stdio: 'ignore' });
  container = execFileSync(
    'docker',
    [
      'run',
      '--rm',
      '--detach',
      '--name',
      name,
      '--tmpfs',
      '/var/lib/postgresql/data:rw,size=512m',
      '-e',
      'POSTGRES_DB=ancora_test',
      '-e',
      'POSTGRES_USER=ancora',
      '-e',
      `POSTGRES_PASSWORD=${password}`,
      '-p',
      '127.0.0.1::5432',
      'pgvector/pgvector:pg16',
    ],
    { encoding: 'utf8' }
  ).trim();
  const mapping = execFileSync('docker', ['port', container, '5432/tcp'], {
    encoding: 'utf8',
  }).trim();
  const port = Number(mapping.split(':').at(-1));
  if (!Number.isInteger(port) || port < 1024) {
    throw new Error('Missing disposable PostgreSQL port.');
  }
  const databaseUrl = `postgresql://ancora:${password}@127.0.0.1:${port}/ancora_test`;
  pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 500 });
  let connected = false;
  for (let trial = 0; trial < 100; ++trial) {
    try {
      await pool.query('SELECT 1');
      connected = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  if (!connected) {
    throw new Error('Disposable PostgreSQL did not become ready.');
  }
  await migratePracticeDatabase(pool, fileURLToPath(new URL('../drizzle', import.meta.url)));

  const args =
    mode === 'db'
      ? [
          'exec',
          'tsx',
          '--test',
          ...(await readdir(new URL('../tests/integration', import.meta.url)))
            .filter((file) => file.endsWith('.test.ts'))
            .map((file) => `tests/integration/${file}`),
        ]
      : ['exec', 'playwright', 'test', ...process.argv.slice(3)];
  const code = await new Promise<number>((resolve, reject) => {
    child = spawn('pnpm', args, {
      cwd: appRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        ANCORA_SYNTHETIC_DATABASE: '1',
      },
    });
    child.once('error', reject);
    child.once('exit', (exitCode) => resolve(exitCode ?? 1));
  });
  process.exitCode = code;
} finally {
  await pool?.end();
  if (container) {
    execFileSync('docker', ['stop', '--time', '2', container], { stdio: 'ignore' });
  }
}
