import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  generatorInputSchema,
  generatorOutputSchema,
  matchesPythonType,
  parseGeneratedCases,
  type ChallengeDraft,
} from '@ancora/schemas';

const synthetic = JSON.parse(
  await readFile(
    new URL('../../../evals/programming-practice/generation-v1.synthetic.json', import.meta.url),
    'utf8'
  )
) as { fixtures: { input: unknown; output: unknown }[] };
const fixtures = synthetic.fixtures.map((fixture) => ({
  input: generatorInputSchema.parse(fixture.input),
  output: generatorOutputSchema.parse(fixture.output),
}));

test('should parse varied synthetic contracts when generation fixtures cross product boundaries', () => {
  const names = new Set<string>();
  const types = new Set<string>();
  for (const fixture of fixtures) {
    assert.equal(fixture.output.draft.concept, fixture.input.request.concept);
    assert.equal(fixture.output.draft.difficulty, fixture.input.request.difficulty);
    const cases = parseGeneratedCases(fixture.output.draft);
    assert.equal(cases.publicCases.length, fixture.output.draft.publicCases.length);
    assert.equal(
      cases.checkCases.length,
      fixture.output.draft.publicCases.length + fixture.output.draft.checkCases.length
    );
    assert.deepEqual(cases.checkCases.slice(0, cases.publicCases.length), cases.publicCases);
    names.add(fixture.output.draft.functionContract.name);
    types.add(fixture.output.draft.functionContract.returns);
  }
  assert.equal(names.size, fixtures.length);
  assert.equal(types.size, fixtures.length);
});

test('should reject unsupported case data when JSON values violate the declared Python contract', () => {
  const original = fixtures[0].output.draft;
  for (const inputJson of [
    '[true]',
    '[1.5]',
    '[1000001]',
    '[[1]]',
    'null',
    JSON.stringify(Array(101).fill(0)),
  ]) {
    const draft: ChallengeDraft = {
      ...original,
      publicCases: [{ ...original.publicCases[0], inputJson }, ...original.publicCases.slice(1)],
    };
    assert.throws(() => parseGeneratedCases(draft), /case_type_mismatch/);
  }
  assert.throws(
    () =>
      parseGeneratedCases({
        ...original,
        checkCases: [
          { ...original.checkCases[0], expectedJson: 'true' },
          ...original.checkCases.slice(1),
        ],
      }),
    /case_type_mismatch/
  );
});

test('should reject duplicate case identities when examples overlap withheld checks', () => {
  const draft = fixtures[0].output.draft;
  assert.throws(
    () =>
      parseGeneratedCases({
        ...draft,
        checkCases: [
          { ...draft.checkCases[0], id: draft.publicCases[0].id },
          ...draft.checkCases.slice(1),
        ],
      }),
    /case_identity_mismatch/
  );
});

test('should use UTF-16 bounds when strings and dictionary keys contain astral characters', () => {
  assert.equal(matchesPythonType('🚀'.repeat(1_000), 'str'), true);
  assert.equal(matchesPythonType('🚀'.repeat(1_001), 'str'), false);
  assert.equal(matchesPythonType({ ['🚀'.repeat(50)]: 'value' }, 'dict[str,str]'), true);
  assert.equal(matchesPythonType({ ['🚀'.repeat(51)]: 'value' }, 'dict[str,str]'), false);
  assert.equal(matchesPythonType({ first: 1, second: '2' }, 'dict[str,int]'), false);
  assert.equal(matchesPythonType({ first: true }, 'dict[str,int]'), false);
});
