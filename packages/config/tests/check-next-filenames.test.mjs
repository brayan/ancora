import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, test } from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = path.join(packageRoot, 'bin/check-next-filenames.mjs');
const fixtureRoots = [];

afterEach(async () => {
  const roots = fixtureRoots.splice(0, fixtureRoots.length);
  await Promise.all(roots.map((root) => rm(root, { force: true, recursive: true })));
});

test('should allow role-based filenames when platform naming is followed', async () => {
  const root = await createFixtureProject({
    'app/(platform)/users/[userId]/page.tsx': 'export default function Page() { return null; }\n',
    'components/ui/SearchBar.test.tsx': "import { SearchBar } from './SearchBar';\nSearchBar;\n",
    'components/ui/SearchBar.tsx': 'export function SearchBar() { return null; }\n',
    'features/users/components/UsersScreen.tsx': 'export function UsersScreen() { return null; }\n',
    'features/users/hooks/useUserFilters.ts': 'export function useUserFilters() { return null; }\n',
    'features/users/data.ts': 'export const loadUsers = () => [];\n',
    'src/react/usePrefersReducedMotion.ts':
      'export function usePrefersReducedMotion() { return false; }\n',
  });

  const result = await execFileAsync(process.execPath, [scriptPath], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.match(result.stdout, /passed/);
});

test('should reject filenames when platform naming is violated', async () => {
  const root = await createFixtureProject({
    'app/(platform)/users/[user-id]/page.tsx': 'export default function Page() { return null; }\n',
    'components/ui/search-bar.tsx': 'export function SearchBar() { return null; }\n',
    'features/users/components/UserScreen.tsx': 'export function UsersScreen() { return null; }\n',
    'features/users/hooks/use-user-filters.ts':
      'export function useUserFilters() { return null; }\n',
    'features/users/Data.ts': 'export const loadUsers = () => [];\n',
    'src/react/use-prefers-reduced-motion.ts':
      'export function usePrefersReducedMotion() { return false; }\n',
  });

  await assert.rejects(
    execFileAsync(process.execPath, [scriptPath], { cwd: root, encoding: 'utf8' }),
    (error) => {
      assert.match(String(error.stderr), /Dynamic segment token must be camelCase/);
      assert.match(String(error.stderr), /React component filename must be PascalCase/);
      assert.match(String(error.stderr), /match exported component "UsersScreen"/);
      assert.match(String(error.stderr), /Hook filename must be camelCase/);
      assert.match(String(error.stderr), /Feature contract filename must be lowercase "data"/);
      return true;
    }
  );
});

async function createFixtureProject(files) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ancora-next-filenames-'));
  fixtureRoots.push(root);
  await Promise.all(
    Object.entries(files).map(async ([relativePath, contents]) => {
      const filePath = path.join(root, relativePath);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, contents);
    })
  );
  return root;
}
