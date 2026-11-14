import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, test } from 'node:test';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const fixtures = [];

afterEach(async () => {
  await Promise.all(
    fixtures.splice(0).map((fixture) => rm(fixture, { recursive: true, force: true }))
  );
});

async function fixture(files) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ancora-web-policy-'));
  fixtures.push(directory);

  for (const [name, content] of Object.entries(files)) {
    const filename = path.join(directory, name);
    await mkdir(path.dirname(filename), { recursive: true });
    await writeFile(filename, content);
  }
  return directory;
}

function check(script, directory) {
  return execute(process.execPath, [path.join(repository, 'apps/web/scripts', script)], {
    cwd: directory,
  });
}

test('should allow thin routes and client-safe modules when imports follow feature ownership', async () => {
  const directory = await fixture({
    'app/practice/page.tsx':
      "import { PracticeScreen } from '@/features/practice/components/PracticeScreen';",
    'features/practice/components/PracticeScreen.tsx':
      "'use client'; import { title } from '../constants';",
    'features/practice/constants.ts': 'export const title = "Synthetic exercise";',
    'server/db/client.ts': "import 'server-only';",
  });

  await check('check-import-boundaries.mjs', directory);
  await check('check-architecture-policy.mjs', directory);
});

test('should reject alias and relative imports when UI crosses product or server boundaries', async () => {
  const directory = await fixture({
    'features/practice/data.ts': "import { page } from '../../app/practice/page';",
    'components/ui/Button.tsx': "import { title } from '@/features/practice/constants';",
    'lib/client.ts': "import { database } from '../server/db/client';",
  });

  await assert.rejects(check('check-import-boundaries.mjs', directory), (error) => {
    assert.match(error.stderr, /features\/practice\/data.ts: forbidden import/);
    assert.match(error.stderr, /components\/ui\/Button.tsx: forbidden import/);
    assert.match(error.stderr, /lib\/client.ts: forbidden import/);
    return true;
  });
});

test('should reject transitive server access when a client imports through a barrel', async () => {
  for (const dependencies of [
    {
      'features/practice/shared.ts': "export { load } from './data';",
      'features/practice/data.ts': 'export const load = () => [];',
    },
    {
      'features/practice/shared.ts': "export { load } from '@/server';",
      'server/index.ts': 'export const load = () => [];',
    },
  ]) {
    const directory = await fixture({
      'features/practice/components/PracticeScreen.tsx':
        "'use client'; import { load } from '../shared';",
      ...dependencies,
    });

    await assert.rejects(check('check-import-boundaries.mjs', directory), (error) => {
      assert.match(error.stderr, /client import reaches server-only code/);
      return true;
    });
  }
});

test('should reject misplaced implementation and environment reads when route contracts are bypassed', async () => {
  const directory = await fixture({
    'app/practice/helpers.ts': 'export const title = "Synthetic";',
    'features/practice/components/PracticeScreen.tsx': 'const secret = process.env.SYNTHETIC_KEY;',
    'features/practice/domain/types.ts': 'export type Exercise = string;',
    'src/unneeded.ts': 'export {};',
  });

  await assert.rejects(check('check-architecture-policy.mjs', directory), (error) => {
    assert.match(error.stderr, /implementation file inside App Router tree/);
    assert.match(error.stderr, /environment read outside server tree/);
    assert.match(error.stderr, /forbidden Clean Architecture/);
    assert.match(error.stderr, /top-level src/);
    return true;
  });
});

test('should enforce SailTech size budgets when route and component files exceed their roles', async () => {
  const directory = await fixture({
    'app/practice/page.tsx': '// synthetic\n'.repeat(151),
    'app/api/practice/route.ts': '// synthetic\n'.repeat(221),
    'features/practice/components/PracticeScreen.tsx': '// synthetic\n'.repeat(451),
    'runner/worker.mjs': '// synthetic\n'.repeat(701),
  });

  await assert.rejects(check('check-typescript-size-guardrails.mjs', directory), (error) => {
    assert.match(error.stderr, /route-entry-file-lines/);
    assert.match(error.stderr, /api-route-file-lines/);
    assert.match(error.stderr, /feature-component-file-lines/);
    assert.match(error.stderr, /product-file-lines/);
    return true;
  });
});

test('should reject stale size exceptions when an oversized module was already repaired', async () => {
  const directory = await fixture({
    'apps/web/app/page.tsx': 'export default function Page() { return null; }',
  });
  // The real app lives two levels below its repository; mirror that placement for exception lookup.
  const app = path.join(directory, 'apps/web');
  await mkdir(app, { recursive: true });
  const quality = path.join(directory, 'config/quality');
  await mkdir(quality, { recursive: true });
  await writeFile(
    path.join(quality, 'typescript-size-guardrails-allowlist.txt'),
    'route-entry-file-lines|app/page.tsx|FILE|Synthetic retired exception\n'
  );

  await assert.rejects(check('check-typescript-size-guardrails.mjs', app), (error) => {
    assert.match(error.stderr, /stale allowlist entries/);
    return true;
  });
});

test('should ignore test and declaration sizes when only product modules have line budgets', async () => {
  const directory = await fixture({
    'runner/protocol.d.mts': '// synthetic\n'.repeat(701),
    'features/practice/runner.test.mjs': '// synthetic\n'.repeat(701),
  });

  await check('check-typescript-size-guardrails.mjs', directory);
});

test('should reject malformed and duplicate exceptions when size policy entries lack a unique reason', async () => {
  const directory = await fixture({ 'apps/web/app/page.tsx': 'export default function Page() {}' });
  const quality = path.join(directory, 'config/quality');
  await mkdir(quality, { recursive: true });
  const allowlist = path.join(quality, 'typescript-size-guardrails-allowlist.txt');

  for (const [content, message] of [
    ['route-entry-file-lines|app/page.tsx|FILE|  \n', /malformed allowlist/],
    [
      'route-entry-file-lines|app/page.tsx|FILE|Synthetic reason\n'.repeat(2),
      /duplicate allowlist/,
    ],
  ]) {
    await writeFile(allowlist, content);
    await assert.rejects(
      check('check-typescript-size-guardrails.mjs', path.join(directory, 'apps/web')),
      (error) => {
        assert.match(error.stderr, message);
        return true;
      }
    );
  }
});
