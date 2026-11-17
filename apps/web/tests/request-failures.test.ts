import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createRequestFailureTracker } from './browser/requestFailures';

function request(method = 'GET', errorText: string | null = 'net::ERR_ABORTED') {
  return {
    method: () => method,
    url: () => 'http://127.0.0.1/synthetic-read',
    failure: () => (errorText === null ? null : { errorText }),
  };
}

describe('Browser request failure tracking', () => {
  test('should allow a canceled read when it was in flight before deliberate navigation', () => {
    const tracker = createRequestFailureTracker();
    const read = request();
    tracker.started(read);
    tracker.prepareForNavigation();
    tracker.failed(read);
    assert.deepEqual(tracker.failures, []);
  });

  test('should report a canceled read when navigation was not prepared', () => {
    const tracker = createRequestFailureTracker();
    const read = request();
    tracker.started(read);
    tracker.failed(read);
    assert.equal(tracker.failures[0]?.errorText, 'net::ERR_ABORTED');
  });

  test('should report a new canceled read when its URL matches one from before navigation', () => {
    const tracker = createRequestFailureTracker();
    const previous = request();
    tracker.started(previous);
    tracker.prepareForNavigation();
    const next = request();
    tracker.started(next);
    tracker.failed(previous);
    tracker.failed(next);
    assert.equal(tracker.failures.length, 1);
    assert.equal(tracker.failures[0]?.errorText, 'net::ERR_ABORTED');
  });

  test('should report a connection failure when the read preceded navigation', () => {
    const tracker = createRequestFailureTracker();
    const read = request('GET', 'net::ERR_CONNECTION_REFUSED');
    tracker.started(read);
    tracker.prepareForNavigation();
    tracker.failed(read);
    assert.equal(tracker.failures[0]?.errorText, 'net::ERR_CONNECTION_REFUSED');
  });

  test('should report canceled writes when navigation interrupts them', () => {
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const tracker = createRequestFailureTracker();
      const write = request(method);
      tracker.started(write);
      tracker.prepareForNavigation();
      tracker.failed(write);
      assert.equal(tracker.failures[0]?.method, method);
    }
  });

  test('should discard the navigation allowance when a read finishes successfully', () => {
    const tracker = createRequestFailureTracker();
    const read = request();
    tracker.started(read);
    tracker.prepareForNavigation();
    tracker.finished(read);
    tracker.failed(read);
    assert.equal(tracker.failures.length, 1);
  });

  test('should report unknown failure details when the browser provides none', () => {
    const tracker = createRequestFailureTracker();
    const read = request('GET', null);
    tracker.started(read);
    tracker.prepareForNavigation();
    tracker.failed(read);
    assert.equal(tracker.failures[0]?.errorText, null);
  });
});
