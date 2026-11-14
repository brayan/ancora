import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Linter } from 'eslint';
import { conventionsPlugin, conventionsRules } from '../eslint/conventions.mjs';

function lint(code, filename = 'example.mjs') {
  return new Linter().verify(
    code,
    [
      {
        files: ['**/*.mjs'],
        languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
        plugins: { ancora: conventionsPlugin },
        rules: conventionsRules,
      },
    ],
    { filename }
  );
}

test('should require braces when an if body returns or performs another statement', () => {
  for (const source of [
    'function stop(value) { if (!value) return; }',
    'if (ready) run(); else stop();',
    'for (const item of items) consume(item);',
  ]) {
    assert.ok(lint(source).some((message) => message.ruleId === 'curly'));
  }

  assert.deepEqual(lint('function stop(value) { if (!value) { return; } }'), []);
});

test('should preserve an else binding when braces are fixed automatically', () => {
  const fixed = new Linter().verifyAndFix('if (first) if (second) run(); else stop();', [
    { rules: { curly: ['error', 'all'] } },
  ]);
  assert.equal(fixed.fixed, true);
  assert.deepEqual(fixed.messages, []);
  assert.match(fixed.output, /if \(second\) \{run\(\);\} else \{stop\(\);\}/);
});

test('should request a named condition when an if directly calls a multiline predicate', () => {
  const messages = lint('if (!isReady(\n  request,\n  limits\n)) { stop(); }');
  assert.ok(messages.some((message) => message.ruleId === 'ancora/conditional-call-extraction'));
  assert.deepEqual(
    lint('const isBlocked = !isReady(\n  request,\n  limits\n);\nif (isBlocked) { stop(); }'),
    []
  );
});

test('should allow mixed conditions and ignore example strings when extraction is unnecessary', () => {
  assert.deepEqual(lint('if (ready && isReady(\n  request\n)) { run(); }'), []);
  assert.deepEqual(lint('const example = "if (!ready) return;";'), []);
});

test('should require behavior titles when a test has a static name', () => {
  const messages = lint('test.only("works", () => {});', 'example.test.mjs');
  assert.ok(messages.some((message) => message.ruleId === 'ancora/test-naming'));
  assert.deepEqual(
    lint('test("should stop when the job is cancelled", () => {});', 'example.test.mjs'),
    []
  );
});

test('should preserve contextual paragraph choices when cohesive statements stay together', () => {
  assert.deepEqual(
    lint(
      'function create(value) {\n  const input = value.trim();\n  validate(input);\n\n  return save(input);\n}'
    ),
    []
  );
});
