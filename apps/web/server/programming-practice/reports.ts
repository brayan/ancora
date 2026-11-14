import { isDeepStrictEqual } from 'node:util';
import { parseRunnerResponse, type RunnerResponse } from '@/runner/protocol.mjs';

export type StoredReport = RunnerResponse | { wireReport: string };

export function storeReport(report: RunnerResponse): StoredReport {
  // JSON strings retain dictionary order inside PostgreSQL JSONB; legacy v1 stays unchanged.
  return report.protocolVersion === 2 ? { wireReport: JSON.stringify(report) } : report;
}

export function restoreReport(stored: StoredReport | null): RunnerResponse | null {
  if (stored === null || !('wireReport' in stored)) {
    return stored;
  }
  const value: unknown = JSON.parse(stored.wireReport);
  const report = parseRunnerResponse(value);
  if (!report || report.protocolVersion !== 2) {
    throw new Error('invalid_stored_report');
  }
  return report;
}

export function sameCaseValue(actual: unknown, expected: unknown) {
  if (!isDeepStrictEqual(actual, expected)) {
    return false;
  }
  if (expected === null || typeof expected !== 'object' || Array.isArray(expected)) {
    return true;
  }

  return (
    actual !== null &&
    typeof actual === 'object' &&
    isDeepStrictEqual(Object.keys(actual), Object.keys(expected))
  );
}

export function sameReport(previous: RunnerResponse | null, report: RunnerResponse) {
  if (!previous || !isDeepStrictEqual(previous, report)) {
    return false;
  }
  return (
    previous.type !== 'result' ||
    report.type !== 'result' ||
    previous.cases.every((item, index) => sameCaseValue(item.actual, report.cases[index].actual))
  );
}
