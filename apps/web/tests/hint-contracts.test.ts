import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  hintInputSchema,
  hintOutputSchema,
  requestHintSchema,
  submitAttemptSchema,
} from '@ancora/schemas';
import fixtures from '../../../evals/programming-practice/hints-v1.synthetic.json' with { type: 'json' };
import { createHintClient, HintCallError } from '../server/clients/practiceHints';

test('should accept public-only hint cases when synthetic inputs cover collections strings and dictionaries', () => {
  for (const fixture of fixtures.fixtures) {
    assert.equal(hintInputSchema.safeParse(fixture.input).success, true);
    assert.equal(
      hintInputSchema.safeParse({ ...fixture.input, source: 'synthetic-code' }).success,
      false
    );
    assert.equal(
      hintInputSchema.safeParse({
        ...fixture.input,
        challenge: { ...fixture.input.challenge, referenceSource: 'synthetic-reference' },
      }).success,
      false
    );
  }
});

test('should reject authority and assistance claims when browsers request hints or submit attempts', () => {
  const request = {
    apiVersion: 1,
    id: randomUUID(),
    revisionId: 'synthetic-positive-even@1',
    level: 1,
  };
  for (const field of ['source', 'challenge', 'state', 'dispatches', 'model', 'accountId']) {
    assert.equal(requestHintSchema.safeParse({ ...request, [field]: 'synthetic' }).success, false);
  }
  for (const level of [0, 4, true, 1.5]) {
    assert.equal(requestHintSchema.safeParse({ ...request, level }).success, false);
  }
  assert.equal(
    submitAttemptSchema.safeParse({
      apiVersion: 1,
      revisionId: request.revisionId,
      submissionId: randomUUID(),
      source: 'pass',
      mode: 'check',
      hintLevel: 0,
    }).success,
    false
  );
});

test('should bound hint output when content is blank oversized or contains unsupported metadata', () => {
  const result = {
    schemaVersion: 1,
    hint: { level: 1, content: 'Think about the public examples.' },
    model: {
      provider: 'openai',
      name: 'synthetic-offline',
      promptVersion: 'programming-hints-v1',
      schemaVersion: 1,
    },
  };
  assert.equal(hintOutputSchema.safeParse(result).success, true);
  for (const content of ['', ' ', 'x'.repeat(1801), '😀'.repeat(901)]) {
    assert.equal(
      hintOutputSchema.safeParse({ ...result, hint: { level: 1, content } }).success,
      false
    );
  }
  assert.equal(hintOutputSchema.safeParse({ ...result, ready: true }).success, false);
});

for (const fault of ['oversized', 'invalid', 'provider_error']) {
  test(`should withhold unsafe transport details without retrying when hint response is ${fault}`, async () => {
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      ++calls;
      return fault === 'oversized'
        ? new Response('x'.repeat(16_001))
        : Response.json(
            { privateMessage: 'synthetic-private-error' },
            { status: fault === 'provider_error' ? 502 : 200 }
          );
    };
    const original = process.env.PRACTICE_SERVICE_TOKEN;
    process.env.PRACTICE_SERVICE_TOKEN = 'synthetic-server-token-at-least-32-characters';
    const client = createHintClient(fetcher);
    if (original === undefined) {
      delete process.env.PRACTICE_SERVICE_TOKEN;
    } else {
      process.env.PRACTICE_SERVICE_TOKEN = original;
    }
    await assert.rejects(
      client.generate(hintInputSchema.parse(fixtures.fixtures[0].input)),
      (error: unknown) =>
        error instanceof HintCallError && !error.message.includes('synthetic-private-error')
    );
    assert.equal(calls, 1);
  });
}
