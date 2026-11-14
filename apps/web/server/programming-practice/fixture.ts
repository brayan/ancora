import type { RevisionContent } from '@/server/db/schema';
import { RUNTIME_VERSION } from '@/runner/protocol.mjs';

export const REFERENCE_CODE =
  'def positive_even(values: list[int]) -> list[int]:\n    return [value for value in values if value > 0 and value % 2 == 0]\n';
export const CHECK_CASES = [
  { id: 'example', input: [3, 2, -4, 0, 8, 2], expected: [2, 8, 2] },
  { id: 'empty', input: [], expected: [] },
  { id: 'non-positive', input: [-4, -2, 0, 1, 3], expected: [] },
  { id: 'duplicates', input: [2, 2, 4, 2], expected: [2, 2, 4, 2] },
  { id: 'bounds', input: [1_000_000, -1_000_000, 999_999], expected: [1_000_000] },
  { id: 'order', input: [8, 4, 2, 6], expected: [8, 4, 2, 6] },
];
export const FIXED_REVISION: RevisionContent = {
  revisionId: 'synthetic-positive-even@1',
  title: 'Keep the positive evens',
  objective: 'Practise filtering with a list comprehension.',
  statement:
    'Write a function that returns a new list containing only the positive, even integers from values.',
  signature: 'positive_even(values: list[int]) → list[int]',
  requirements: [
    'Construct the result with a list comprehension.',
    'Keep the original order and duplicates.',
    'Leave the input list unchanged.',
    'Zero is not positive. Inputs are valid integers, excluding booleans.',
  ],
  starterCode: 'def positive_even(values: list[int]) -> list[int]:\n    return []\n',
  publicCases: CHECK_CASES.slice(0, 2),
  referenceSource: REFERENCE_CODE,
  checkCases: CHECK_CASES,
  runtimeVersion: RUNTIME_VERSION,
  validatorVersion: 'positive-even@1',
};
