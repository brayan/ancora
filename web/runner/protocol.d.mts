import type { FunctionContract } from '@ancora/schemas';

export const PROTOCOL_VERSION: 1;
export const GENERAL_PROTOCOL_VERSION: 2;
export const RUNTIME_VERSION: '314.0.7';
export const MAX_SOURCE_LENGTH: number;
export const MAX_OUTPUT_LENGTH: number;
export const MAX_MESSAGE_LENGTH: number;
export const BOOT_TIMEOUT_MS: number;
export const RUN_TIMEOUT_MS: number;
export type JobBinding = Readonly<{
  protocolVersion: 1 | 2;
  jobId: string;
  revisionId: string;
  sourceDigest: string;
  casesDigest: string;
  runtimeVersion: string;
}>;
export type RunnerCase = Readonly<{
  id: string;
  input: number[];
  expected: number[];
}>;
export type RunnerValue =
  | number
  | string
  | number[]
  | string[]
  | Record<string, number>
  | Record<string, string>;
export type GenericRunnerCase = Readonly<{
  id: string;
  input: RunnerValue;
  expected: RunnerValue;
}>;
export type Technique = 'list_comprehension' | 'dict_comprehension' | 'none';
type RequestContent = JobBinding &
  Readonly<{
    type: 'run';
    source: string;
  }>;
export type LegacyRunRequest = RequestContent &
  Readonly<{
    protocolVersion: 1;
    cases: RunnerCase[];
    functionName: 'positive_even';
    technique: 'list_comprehension' | 'none';
  }>;
export type GenericRunRequest = RequestContent &
  Readonly<{
    protocolVersion: 2;
    cases: GenericRunnerCase[];
    functionContract: FunctionContract;
    technique: Technique;
  }>;
export type RunRequest = LegacyRunRequest | GenericRunRequest;
export type CaseResult = Readonly<{
  id: string;
  passed: boolean;
  actual: RunnerValue | null;
  mutated: boolean;
}>;
export type RunResult = JobBinding &
  Readonly<{
    type: 'result';
    cases: CaseResult[];
    technique: 'passed' | 'failed' | 'inconclusive' | 'not_required';
    output: string;
    error: string | null;
    loadMs: number;
    executionMs: number;
  }>;
export type RunFailure = JobBinding &
  Readonly<{
    type: 'failure';
    code:
      | 'bootstrap_error'
      | 'execution_error'
      | 'timeout'
      | 'stopped'
      | 'output_limit'
      | 'invalid_message';
    output: string;
  }>;
export type RunnerResponse = RunResult | RunFailure;
export function isRunRequest(value: unknown): value is RunRequest;
export function isLoadedResponse(value: unknown): value is JobBinding & { type: 'loaded' };
export function parseRunnerResponse(value: unknown): RunnerResponse | null;
export function jobBinding(request: RunRequest): JobBinding;
export function matchesJob(response: JobBinding, request: JobBinding): boolean;
export function resultsMatchCases(response: RunnerResponse, request: RunRequest): boolean;
export function digestText(text: string): Promise<string>;
export function casesDigestText(
  cases: readonly GenericRunnerCase[],
  functionContract?: FunctionContract
): string;
