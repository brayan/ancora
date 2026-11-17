import type { Request } from '@playwright/test';

type TrackedRequest = Pick<Request, 'failure' | 'method' | 'url'>;
type RequestFailure = { url: string; method: string; errorText: string | null };

export function createRequestFailureTracker() {
  const active = new Set<TrackedRequest>();
  const navigating = new WeakSet<TrackedRequest>();
  const failures: RequestFailure[] = [];

  return {
    failures,
    started(request: TrackedRequest) {
      active.add(request);
    },
    finished(request: TrackedRequest) {
      active.delete(request);
      navigating.delete(request);
    },
    failed(request: TrackedRequest) {
      active.delete(request);
      const errorText = request.failure()?.errorText ?? null;
      const expectedNavigationAbort = navigating.has(request) && errorText === 'net::ERR_ABORTED';
      navigating.delete(request);
      if (!expectedNavigationAbort) {
        failures.push({ url: request.url(), method: request.method(), errorText });
      }
    },
    prepareForNavigation() {
      for (const request of active) {
        if (request.method() === 'GET') {
          navigating.add(request);
        }
      }
    },
  };
}
