import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { createServer } from 'node:net';
import { migratePracticeDatabase } from '../server/db/migrations';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const name = `ancora-practice-test-${randomUUID()}`;
const password = randomUUID();
const mode = process.argv[2];
if (!['db', 'browser'].includes(mode)) {
  throw new Error('Choose db or browser tests.');
}

let container: string | null = null;
let child: ReturnType<typeof spawn> | null = null;
let pool: Pool | null = null;
let generationService: ReturnType<typeof spawn> | null = null;
const serviceToken = randomUUID();
const stop = () => {
  child?.kill('SIGTERM');
  generationService?.kill('SIGTERM');
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

  if (mode === 'browser') {
    await new Promise<void>((resolve, reject) => {
      const probe = createServer();
      probe.once('error', reject);
      probe.listen(8001, '127.0.0.1', () => probe.close(() => resolve()));
    });
    generationService = spawn(
      'uv',
      [
        'run',
        '--frozen',
        '--all-packages',
        'python',
        'apps/practice-service/tests/serve_synthetic.py',
      ],
      {
        cwd: repoRoot,
        stdio: 'inherit',
        env: {
          NODE_ENV: 'test',
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          UV_CACHE_DIR: process.env.UV_CACHE_DIR,
          UV_PYTHON_INSTALL_DIR: process.env.UV_PYTHON_INSTALL_DIR,
          ANCORA_SYNTHETIC_DATABASE: '1',
          ANCORA_SYNTHETIC_PROVIDER: '1',
          PRACTICE_SERVICE_TOKEN: serviceToken,
        },
      }
    );
    let startupError = false;
    generationService.once('error', () => {
      startupError = true;
    });
    let ready = false;
    for (let trial = 0; trial < 100; ++trial) {
      if (startupError || generationService.exitCode !== null) {
        break;
      }
      try {
        const status = await fetch('http://127.0.0.1:8001/v1/status', {
          headers: { Authorization: `Bearer ${serviceToken}` },
          signal: AbortSignal.timeout(500),
        });
        ready = status.ok;
        await status.body?.cancel();
        if (ready) {
          break;
        }
      } catch {
        // Only the newly launched, authenticated synthetic service can satisfy readiness.
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!ready) {
      throw new Error('Synthetic generation service did not become ready.');
    }
  }

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
        PRACTICE_SERVICE_TOKEN: mode === 'browser' ? serviceToken : '',
        OPENAI_API_KEY: '',
        PRACTICE_GENERATION_ENABLED: '',
      },
    });
    child.once('error', reject);
    child.once('exit', (exitCode) => resolve(exitCode ?? 1));
  });
  process.exitCode = code;
} finally {
  if (
    generationService?.pid &&
    generationService.exitCode === null &&
    generationService.signalCode === null
  ) {
    const service = generationService;
    await new Promise<void>((resolve) => {
      const force = setTimeout(() => service.kill('SIGKILL'), 3_000);
      service.once('exit', () => {
        clearTimeout(force);
        resolve();
      });
      service.kill('SIGTERM');
    });
  }
  await pool?.end();
  if (container) {
    execFileSync('docker', ['stop', '--time', '2', container], { stdio: 'ignore' });
  }
}
