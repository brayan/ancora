import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHECK_CASES } from '../server/programming-practice/fixture';
import {
  digestText,
  casesDigestText,
  isRunRequest,
  isLoadedResponse,
  jobBinding,
  matchesJob,
  parseRunnerResponse,
  resultsMatchCases,
  RUNTIME_VERSION,
  type LegacyRunRequest,
} from '../runner/protocol.mjs';

async function request(): Promise<LegacyRunRequest> {
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

test('should preserve legacy case digests when a persisted v1 request is replayed', () => {
  assert.equal(casesDigestText(CHECK_CASES), JSON.stringify(CHECK_CASES));
});

test('should bind generic case digests to canonical contracts when property order changes', () => {
  const contract = {
    name: 'word_sizes',
    parameter: { name: 'words', type: 'list[str]' as const },
    returns: 'dict[str,int]' as const,
  };
  const cases = [{ id: 'words', input: ['ab'], expected: { ab: 2, a: 1 } }];
  assert.equal(
    casesDigestText(cases, contract),
    casesDigestText([{ expected: { ab: 2, a: 1 }, input: ['ab'], id: 'words' }], {
      returns: contract.returns,
      parameter: { type: contract.parameter.type, name: 'words' },
      name: 'word_sizes',
    })
  );
  assert.notEqual(
    casesDigestText(cases, contract),
    casesDigestText(cases, { ...contract, name: 'other_name' })
  );
});

test('should accept bounded generic contracts when cases match declared input and output types', async () => {
  const legacy = await request();
  const envelope = Object.fromEntries(
    Object.entries(legacy).filter(([key]) => key !== 'functionName')
  );
  for (const [inputType, outputType, input, expected] of [
    ['int', 'str', 42, '42'],
    ['str', 'list[str]', 'hello', ['hello']],
    ['list[str]', 'dict[str,int]', ['ab'], { ab: 2 }],
    ['dict[str,str]', 'dict[str,str]', { ab: 'cd' }, { ab: 'CD' }],
  ] as const) {
    assert.equal(
      isRunRequest({
        ...envelope,
        protocolVersion: 2,
        functionContract: {
          name: 'synthetic_function',
          parameter: { name: 'argument', type: inputType },
          returns: outputType,
        },
        cases: [{ id: 'generic', input, expected }],
        technique: 'dict_comprehension',
      }),
      true
    );
  }
});

test('should reject unsupported generic values when types or capability bounds are violated', async () => {
  const legacy = await request();
  const envelope = Object.fromEntries(
    Object.entries(legacy).filter(([key]) => key !== 'functionName')
  );
  const contract = {
    name: 'word_sizes',
    parameter: { name: 'words', type: 'list[str]' },
    returns: 'dict[str,int]',
  };
  const valid = {
    ...envelope,
    protocolVersion: 2,
    functionContract: contract,
    cases: [{ id: 'generic', input: ['ab'], expected: { ab: 2 } }],
  };
  for (const change of [
    { functionName: 'positive_even' },
    { functionContract: { ...contract, name: '__unsafe' } },
    { functionContract: { ...contract, returns: 'object' } },
    { functionContract: { ...contract, parameter: { name: 'words', type: 'tuple' } } },
    { cases: [{ id: 'bad', input: ['a'.repeat(2_001)], expected: {} }] },
    { cases: [{ id: 'bad', input: Array(101).fill('a'), expected: {} }] },
    { cases: [{ id: 'bad', input: ['a'], expected: { a: true } }] },
    { cases: [{ id: 'bad', input: ['a'], expected: { a: 1_000_001 } }] },
    { cases: [{ id: 'bad', input: ['a'], expected: { ['x'.repeat(101)]: 1 } }] },
    { cases: [{ id: 'bad', input: ['a'], expected: { a: { nested: 1 } } }] },
  ]) {
    assert.equal(isRunRequest({ ...valid, ...change }), false);
  }
});

test('should restrict generic result values when the report is parsed independently', async () => {
  const legacy = await request();
  const base = {
    ...jobBinding(legacy),
    protocolVersion: 2,
    type: 'result',
    technique: 'not_required',
    output: '',
    error: null,
    loadMs: 1,
    executionMs: 1,
  };
  for (const actual of [1, 'word', [1], ['word'], { word: 4 }, { word: 'WORD' }, null]) {
    assert.ok(
      parseRunnerResponse({
        ...base,
        cases: [{ id: 'generic', passed: true, actual, mutated: false }],
      })
    );
  }
  for (const actual of [true, 1.5, new Date(0), { one: 1, two: '2' }, [[1]], Array(101).fill(0)]) {
    assert.equal(
      parseRunnerResponse({
        ...base,
        cases: [{ id: 'generic', passed: false, actual, mutated: false }],
      }),
      null
    );
  }
  assert.equal(
    parseRunnerResponse({
      ...base,
      protocolVersion: 1,
      cases: [{ id: 'legacy', passed: true, actual: 'string', mutated: false }],
    }),
    null
  );
});

test('should bind dictionary data order when generic case digests preserve wire enumeration', () => {
  const contract = {
    name: 'copy_scores',
    parameter: { name: 'scores', type: 'dict[str,int]' as const },
    returns: 'dict[str,int]' as const,
  };
  const ordered = { first: 1, second: 2 };
  const reversed = { second: 2, first: 1 };
  const original = casesDigestText(
    [{ id: 'mapping', input: ordered, expected: ordered }],
    contract
  );
  assert.notEqual(
    original,
    casesDigestText([{ id: 'mapping', input: reversed, expected: ordered }], contract)
  );
  assert.notEqual(
    original,
    casesDigestText([{ id: 'mapping', input: ordered, expected: reversed }], contract)
  );
});
