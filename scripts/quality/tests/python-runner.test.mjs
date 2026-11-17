import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, test } from 'node:test';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const fixtures = [];
const scope = ['apps/api', 'apps/web/runner/harness.py', 'apps/web/tests/python'];
const commands = [
  ['ruff', 'check', '.'],
  ['sailtech-check-parameters', ...scope],
  ['sailtech-check-conditions', ...scope],
  ['sailtech-check-class-spacing', ...scope],
  ['sailtech-check-ordering', ...scope],
  ['ruff', 'format', '--check', '.'],
  ['pyright'],
  ['tach', 'check', '--exact'],
  ['sailtech-check-domain-imports', '--source-root', 'apps/api/src'],
  ['python', '-m', 'pytest'],
];

afterEach(async () => {
  await Promise.all(
    fixtures.splice(0).map((directory) => rm(directory, { force: true, recursive: true }))
  );
});

async function runnerFixture() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ancora-python-runner-'));
  fixtures.push(directory);
  const bin = path.join(directory, 'bin');
  const runner = path.join(directory, 'scripts/ci/run-python-checks.sh');
  const log = path.join(directory, 'calls.jsonl');
  await mkdir(bin);
  await mkdir(path.dirname(runner), { recursive: true });
  await copyFile(path.join(repository, 'scripts/ci/run-python-checks.sh'), runner);
  await writeFile(log, '');
  // The substitute records orchestration only; no tool, provider or scanned source is executed.
  const substitute = `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.RUNNER_LOG, JSON.stringify({
  args,
  cwd: process.cwd(),
  bytecode: process.env.PYTHONDONTWRITEBYTECODE,
}) + '\\n');
process.exit(args.join(' ') === process.env.FAIL_COMMAND ? 7 : 0);
`;
  await writeFile(path.join(bin, 'uv'), substitute, { mode: 0o755 });

  return {
    directory,
    log,
    runner,
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      RUNNER_LOG: log,
      FAIL_COMMAND: '',
      PYTHONDONTWRITEBYTECODE: '0',
    },
  };
}

async function recordedCalls(log) {
  return (await readFile(log, 'utf8'))
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test('should run all frozen checks from the repository root when launched elsewhere', async () => {
  const fixture = await runnerFixture();

  await execute(fixture.runner, ['all'], { cwd: os.tmpdir(), env: fixture.env });

  const calls = await recordedCalls(fixture.log);
  assert.deepEqual(
    calls.map(({ args }) => args),
    commands.map((command) => ['run', '--frozen', '--all-packages', ...command])
  );
  for (const call of calls) {
    assert.equal(call.cwd, await realpath(fixture.directory));
    assert.equal(call.bytecode, '1');
  }
});

for (const [index, command] of commands.entries()) {
  test(`should stop the lane when ${command.join(' ')} fails inside a shell conditional`, async () => {
    const fixture = await runnerFixture();
    const invocation = ['run', '--frozen', '--all-packages', ...command].join(' ');

    await assert.rejects(
      execute('bash', ['-c', 'if "$1" all; then exit 0; else exit "$?"; fi', '_', fixture.runner], {
        cwd: os.tmpdir(),
        env: { ...fixture.env, FAIL_COMMAND: invocation },
      }),
      { code: 7 }
    );

    const calls = await recordedCalls(fixture.log);
    assert.equal(calls.length, index + 1);
    assert.equal(calls.at(-1).args.join(' '), invocation);
  });
}

test('should reject invalid arguments before invoking tools when the lane is unknown', async () => {
  const fixture = await runnerFixture();

  for (const args of [['unknown'], ['lint', 'extra']]) {
    await assert.rejects(execute(fixture.runner, args, { env: fixture.env }), { code: 2 });
  }

  assert.deepEqual(await recordedCalls(fixture.log), []);
});
