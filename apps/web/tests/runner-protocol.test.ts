import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHECK_CASES } from '../features/programming-practice/constants';
import {
  digestText,
  isRunRequest,
  isLoadedResponse,
  jobBinding,
  matchesJob,
  parseRunnerResponse,
  resultsMatchCases,
  RUNTIME_VERSION,
  type RunRequest,
} from '../runner/protocol.mjs';

async function request(): Promise<RunRequest> {
  const source = 'def positive_even(values):\n    return []\n';
  return {
    type: 'run',
    protocolVersion: 1,
    jobId: 'job-1',
    revisionId: 'synthetic@1',
    sourceDigest: await digestText(source),
    casesDigest: await digestText(JSON.stringify(CHECK_CASES)),
    runtimeVersion: RUNTIME_VERSION,
    source,
    cases: CHECK_CASES,
    functionName: 'positive_even',
    technique: 'list_comprehension',
  };
}

test('should accept the bounded contract when the job and cases are supported', async () => {
  assert.equal(isRunRequest(await request()), true);
});

test('should reject unsupported and oversized payloads when an envelope crosses limits', async () => {
  const valid = await request();
  for (const change of [
    { source: 'x'.repeat(12_001) },
    { source: '' },
    { runtimeVersion: 'other' },
    { sourceDigest: 'invalid' },
    { sourceDigest: [valid.sourceDigest] },
    { functionName: 'eval' },
    { technique: 'anything' },
    { accountId: 'account_1' },
    { cases: [{ id: 'case', input: [true], expected: [] }] },
    { cases: [{ id: 'case', input: [Infinity], expected: [] }] },
    { cases: [valid.cases[0], valid.cases[0]] },
    { cases: null },
  ]) {
    assert.equal(isRunRequest({ ...valid, ...change }), false);
  }
});

test('should reject action-shaped and oversized reports when parsing runner output', () => {
  assert.equal(parseRunnerResponse({ type: 'generate', prompt: 'untrusted' }), null);
  assert.equal(parseRunnerResponse(null), null);
});

test('should reject stale bindings and altered cases when a report belongs to another job', async () => {
  const valid = await request();
  const report = {
    ...jobBinding(valid),
    type: 'result' as const,
    cases: valid.cases.map(({ id }) => ({
      id,
      passed: true,
      actual: [],
      mutated: false,
    })),
    technique: 'passed' as const,
    output: '',
    error: null,
    loadMs: 100,
    executionMs: 2,
  };
  assert.ok(parseRunnerResponse(report));
  for (const key of [
    'jobId',
    'revisionId',
    'sourceDigest',
    'casesDigest',
    'runtimeVersion',
  ] as const) {
    assert.equal(matchesJob({ ...report, [key]: 'stale' }, valid), false);
  }
  assert.equal(resultsMatchCases({ ...report, cases: [...report.cases].reverse() }, valid), false);
  assert.equal(parseRunnerResponse({ ...report, output: 'a'.repeat(8_001) }), null);
  assert.equal(parseRunnerResponse({ ...report, action: 'generate' }), null);
  assert.equal(parseRunnerResponse({ ...report, loadMs: -1 }), null);
});

test('should reject malformed loaded events when a worker tries to reset a deadline', async () => {
  const valid = await request();
  const loaded = { ...jobBinding(valid), type: 'loaded' };
  assert.equal(isLoadedResponse(loaded), true);
  assert.equal(isLoadedResponse({ ...loaded, runtimeVersion: 'stale' }), false);
  assert.equal(isLoadedResponse({ ...loaded, action: 'generate' }), false);
});
