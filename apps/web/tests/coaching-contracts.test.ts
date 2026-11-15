import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  coachingInputSchema,
  requestCoachingSchema,
  retryCoachingSchema,
  submitAttemptSchema,
} from '@ancora/schemas';
import fixtures from '../../../evals/programming-practice/coaching-v1.synthetic.json' with { type: 'json' };
import { createCoachingClient, CoachingCallError } from '../server/clients/practiceCoaching';
const input = coachingInputSchema.parse(fixtures.fixtures[0].input);

test('should accept bounded coaching cases when synthetic attempts cover lists strings and dictionaries', () => {
  for (const fixture of fixtures.fixtures) {
    assert.equal(coachingInputSchema.safeParse(fixture.input).success, true);
  }
});

test('should require affirmative code sharing when browsers request initial or retry coaching', () => {
  const request = { apiVersion: 1, id: randomUUID(), attemptId: randomUUID(), shareCode: true };
  assert.equal(requestCoachingSchema.safeParse(request).success, true);
  for (const shareCode of [undefined, false, 'true', 1]) {
    assert.equal(requestCoachingSchema.safeParse({ ...request, shareCode }).success, false);
    assert.equal(retryCoachingSchema.safeParse({ apiVersion: 1, shareCode }).success, false);
  }
  for (const field of [
    'source',
    'draft',
    'challenge',
    'evidence',
    'revisionId',
    'state',
    'dispatches',
    'model',
    'coachingAvailable',
  ]) {
    assert.equal(
      requestCoachingSchema.safeParse({ ...request, [field]: 'synthetic' }).success,
      false
    );
  }
  assert.equal(
    submitAttemptSchema.safeParse({
      apiVersion: 1,
      revisionId: 'synthetic@1',
      submissionId: randomUUID(),
      source: 'pass',
      mode: 'check',
      coachingAvailable: false,
    }).success,
    false
  );
});

test('should reject raw reports and hidden context when constructing typed provider input', () => {
  for (const field of ['report', 'stdout', 'checkCases', 'referenceSource']) {
    assert.equal(coachingInputSchema.safeParse({ ...input, [field]: 'synthetic' }).success, false);
  }
  assert.equal(
    coachingInputSchema.safeParse({
      ...input,
      evidence: { ...input.evidence, output: 'synthetic' },
    }).success,
    false
  );
});

for (const fault of ['oversized', 'invalid', 'provider_error']) {
  test(`should withhold unsafe transport details without retrying when coaching response is ${fault}`, async () => {
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      ++calls;
      return fault === 'oversized'
        ? new Response('x'.repeat(40_001))
        : Response.json(
            { privateMessage: 'synthetic-private-error' },
            { status: fault === 'provider_error' ? 502 : 200 }
          );
    };
    const original = process.env.PRACTICE_SERVICE_TOKEN;
    process.env.PRACTICE_SERVICE_TOKEN = 'synthetic-server-token-at-least-32-characters';
    const client = createCoachingClient(fetcher);
    if (original === undefined) {
      delete process.env.PRACTICE_SERVICE_TOKEN;
    } else {
      process.env.PRACTICE_SERVICE_TOKEN = original;
    }
    await assert.rejects(
      client.generate(input),
      (error: unknown) =>
        error instanceof CoachingCallError && !error.message.includes('synthetic-private-error')
    );
    assert.equal(calls, 1);
  });
}

test('should accept bounded Unicode feedback when its encoded response exceeds the hint transport limit', async () => {
  const text = '語'.repeat(900);
  const output = {
    schemaVersion: 1,
    feedback: { summary: text, observations: [text, text, text, text], nextStep: text },
    model: {
      provider: 'openai',
      name: 'synthetic-offline',
      promptVersion: 'programming-coaching-v1',
      schemaVersion: 1,
    },
  };
  assert.ok(new TextEncoder().encode(JSON.stringify(output)).length > 16000);
  const original = process.env.PRACTICE_SERVICE_TOKEN;
  process.env.PRACTICE_SERVICE_TOKEN = 'synthetic-server-token-at-least-32-characters';
  const client = createCoachingClient(async () => Response.json(output));
  if (original === undefined) {
    delete process.env.PRACTICE_SERVICE_TOKEN;
  } else {
    process.env.PRACTICE_SERVICE_TOKEN = original;
  }
  assert.deepEqual(await client.generate(input), output);
});
