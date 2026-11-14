import assert from 'node:assert/strict';
import { test } from 'node:test';
import { saveDraftSchema, submitAttemptSchema, completeAttemptSchema } from '@ancora/schemas';
import { randomUUID } from 'node:crypto';

test('should preserve empty draft edits when execution still requires nonblank bounded source', () => {
  const draft = { apiVersion: 1, revisionId: 'synthetic-positive-even@1', source: '', version: 0 };
  assert.equal(saveDraftSchema.safeParse(draft).success, true);
  const submission = {
    apiVersion: 1,
    revisionId: draft.revisionId,
    submissionId: randomUUID(),
    source: '  ',
    mode: 'check',
  };
  assert.equal(submitAttemptSchema.safeParse(submission).success, false);
  assert.equal(
    submitAttemptSchema.safeParse({ ...submission, source: 'x'.repeat(12_001) }).success,
    false
  );
});

test('should reject unsupported versions and authority fields when parsing product requests', () => {
  const draft = { apiVersion: 1, revisionId: 'synthetic-positive-even@1', source: '', version: 0 };
  assert.equal(saveDraftSchema.safeParse({ ...draft, apiVersion: 2 }).success, false);
  assert.equal(
    saveDraftSchema.safeParse({ ...draft, accountId: 'browser-supplied' }).success,
    false
  );
  assert.equal(completeAttemptSchema.safeParse({ apiVersion: 1 }).success, false);
  assert.equal(completeAttemptSchema.safeParse({ apiVersion: 1, report: null }).success, false);
});
