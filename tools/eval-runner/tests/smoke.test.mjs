import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runSmoke } from '../dist/smoke.js';

test('should return deterministic synthetic metadata when the smoke scaffold runs', () => {
  assert.deepEqual(runSmoke(), {
    checks: [],
    dataset: 'synthetic-empty',
    status: 'ok',
    suite: 'smoke',
  });
});
