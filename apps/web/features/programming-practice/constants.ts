import type { RunnerCase } from "@/runner/protocol.mjs";

export const RUNNER_ORIGIN = "http://127.0.0.1:3001";
export const CHALLENGE_REVISION = "synthetic-positive-even@1";
export const STARTER_CODE =
  "def positive_even(values: list[int]) -> list[int]:\n    return []\n";
export const REFERENCE_CODE =
  "def positive_even(values: list[int]) -> list[int]:\n    return [value for value in values if value > 0 and value % 2 == 0]\n";
export const PUBLIC_CASES: RunnerCase[] = [
  { id: "example", input: [3, 2, -4, 0, 8, 2], expected: [2, 8, 2] },
  { id: "empty", input: [], expected: [] },
];
export const CHECK_CASES: RunnerCase[] = [
  ...PUBLIC_CASES,
  { id: "non-positive", input: [-4, -2, 0, 1, 3], expected: [] },
  { id: "duplicates", input: [2, 2, 4, 2], expected: [2, 2, 4, 2] },
  {
    id: "bounds",
    input: [1_000_000, -1_000_000, 999_999],
    expected: [1_000_000],
  },
  { id: "order", input: [8, 4, 2, 6], expected: [8, 4, 2, 6] },
];
