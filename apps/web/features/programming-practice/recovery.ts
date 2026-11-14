import { attemptSchema } from '@ancora/schemas';
import { parseRunnerResponse, type RunnerResponse } from '@/runner/protocol.mjs';

export type PendingReport = { id: string; report: RunnerResponse };
const prefix = 'ancora:pending-result:v1:';

export function readPendingReport(revisionId: string): PendingReport | null {
  try {
    for (let index = 0; index < localStorage.length; ++index) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) {
        continue;
      }
      const raw = localStorage.getItem(key);
      if (!raw || raw.length >= 100_000) {
        continue;
      }
      let pending;
      try {
        pending = JSON.parse(raw);
      } catch {
        continue;
      }
      const report = parseRunnerResponse(pending?.report);
      if (
        report &&
        attemptSchema.shape.id.safeParse(pending.id).success &&
        pending.id === report.jobId &&
        report.revisionId === revisionId &&
        key === prefix + pending.id
      ) {
        return { id: pending.id, report };
      }
    }
  } catch {
    // Browser storage can be disabled; current-tab recovery remains in React state.
  }
  return null;
}

export function writePendingReport(value: PendingReport) {
  try {
    localStorage.setItem(prefix + value.id, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removePendingReport(id: string) {
  try {
    localStorage.removeItem(prefix + id);
  } catch {
    // Replaying an acknowledged completion after reload remains idempotent.
  }
}
