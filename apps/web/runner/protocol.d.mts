export const PROTOCOL_VERSION: 1;
export const RUNTIME_VERSION: "314.0.7";
export const MAX_SOURCE_LENGTH: number;
export const MAX_OUTPUT_LENGTH: number;
export const MAX_MESSAGE_LENGTH: number;
export const BOOT_TIMEOUT_MS: number;
export const RUN_TIMEOUT_MS: number;
export type JobBinding = Readonly<{
  protocolVersion: 1;
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
export type RunRequest = JobBinding &
  Readonly<{
    type: "run";
    source: string;
    cases: RunnerCase[];
    functionName: "positive_even";
    technique: "list_comprehension" | "none";
  }>;
export type CaseResult = Readonly<{
  id: string;
  passed: boolean;
  actual: number[] | null;
  mutated: boolean;
}>;
export type RunResult = JobBinding &
  Readonly<{
    type: "result";
    cases: CaseResult[];
    technique: "passed" | "failed" | "inconclusive" | "not_required";
    output: string;
    error: string | null;
    loadMs: number;
    executionMs: number;
  }>;
export type RunFailure = JobBinding &
  Readonly<{
    type: "failure";
    code:
      | "bootstrap_error"
      | "execution_error"
      | "timeout"
      | "stopped"
      | "output_limit"
      | "invalid_message";
    output: string;
  }>;
export type RunnerResponse = RunResult | RunFailure;
export function isRunRequest(value: unknown): value is RunRequest;
export function isLoadedResponse(
  value: unknown,
): value is JobBinding & { type: "loaded" };
export function parseRunnerResponse(value: unknown): RunnerResponse | null;
export function jobBinding(request: RunRequest): JobBinding;
export function matchesJob(response: JobBinding, request: JobBinding): boolean;
export function resultsMatchCases(
  response: RunnerResponse,
  request: RunRequest,
): boolean;
export function digestText(text: string): Promise<string>;
