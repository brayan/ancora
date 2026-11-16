import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { CoachingInput, CoachingOutput } from '@ancora/schemas';
import * as schema from '../../server/db/schema';
import { createPracticeRepository } from '../../server/programming-practice/repository';
import { createPracticeService } from '../../server/programming-practice/service';
import { createCoachingRepository } from '../../server/programming-practice/coaching/repository';
import { createCoachingService } from '../../server/programming-practice/coaching/service';
import { CoachingCallError, type CoachingClient } from '../../server/clients/practiceCoaching';
import { FIXED_REVISION } from '../../server/programming-practice/fixture';
import { migratePracticeDatabase } from '../../server/db/migrations';

assert.equal(process.env.ANCORA_SYNTHETIC_DATABASE, '1', 'Use the disposable database wrapper.');
assert.equal(new URL(process.env.DATABASE_URL!).pathname, '/ancora_test');
const admin = new Pool({ connectionString: process.env.DATABASE_URL });
const name = `ancora_coaching_${randomUUID().replaceAll('-', '')}`;
assert.match(name, /^[a-z0-9_]+$/);
const url = new URL(process.env.DATABASE_URL!);
url.pathname = `/${name}`;
const pool = new Pool({ connectionString: url.toString() });
let created = false;
before(async () => {
  await admin.query(`CREATE DATABASE ${name}`);
  created = true;
  await migratePracticeDatabase(pool, fileURLToPath(new URL('../../drizzle', import.meta.url)));
});
const database = drizzle(pool, { schema });
const practiceRepository = createPracticeRepository(database);
const practice = createPracticeService(practiceRepository);
const repository = createCoachingRepository(database);
after(async () => {
  await pool.end();
  try {
    if (created) {
      await admin.query(`DROP DATABASE ${name}`);
    }
  } finally {
    await admin.end();
  }
});

async function revision() {
  const id = `synthetic-hints:${randomUUID()}`;
  const content = { ...FIXED_REVISION, revisionId: id };
  await database.insert(schema.practiceChallenges).values({ id });
  await database.insert(schema.practiceRevisions).values({
    id,
    challengeId: id,
    revision: 1,
    content,
    contentDigest: createHash('sha256').update(JSON.stringify(content)).digest('hex'),
  });
  await database
    .insert(schema.practiceDrafts)
    .values({ revisionId: id, source: content.starterCode });
  return id;
}

function output(): CoachingOutput {
  return {
    schemaVersion: 1,
    feedback: {
      summary: 'Review the filter in this saved attempt.',
      observations: ['Use the public example to inspect the selected elements.'],
      nextStep: 'Consider the positive and even conditions together.',
    },
    model: {
      provider: 'openai',
      name: 'synthetic-offline',
      promptVersion: 'programming-coaching-v1',
      schemaVersion: 1,
    },
  };
}

function setup(generate: (input: CoachingInput) => Promise<CoachingOutput> = async () => output()) {
  const calls: CoachingInput[] = [];
  const client: CoachingClient = {
    status: async () => ({ available: true, model: 'synthetic-offline' }),
    generate: async (input) => {
      calls.push(input);
      return generate(input);
    },
  };
  return { calls, client, service: createCoachingService(repository, practiceRepository, client) };
}

async function submit(revisionId: string, completed = true) {
  const saved = await practice.submit({
    apiVersion: 1,
    revisionId,
    submissionId: randomUUID(),
    source: '# Synthetic saved source canary\ndef positive_even(values):\n    return values\n',
    mode: 'check',
  });
  if (completed) {
    const report = {
      ...saved.request,
      type: 'failure',
      code: 'timeout',
      output: 'synthetic-private-stdout',
    };
    // Submit only protocol-bound fields, never the request source/cases.
    await practice.complete(saved.attemptId, {
      type: 'failure',
      protocolVersion: report.protocolVersion,
      jobId: report.jobId,
      revisionId,
      sourceDigest: report.sourceDigest,
      casesDigest: report.casesDigest,
      runtimeVersion: report.runtimeVersion,
      code: 'timeout',
      output: report.output,
    });
  }
  return saved.attemptId;
}

test('should share only the selected saved source and public context when coaching is requested', async () => {
  const id = await revision();
  const attemptId = await submit(id);
  const before = await practice.viewAttempt(attemptId);
  const original = await practiceRepository.draft(id);
  await practiceRepository.saveDraft(id, '# Synthetic current draft excluded', original.version);
  const { service, calls } = setup();
  const row = await service.start(randomUUID(), attemptId);

  assert.equal(row.state, 'ready');
  assert.equal(row.attemptId, attemptId);
  assert.equal(row.sourceDigest, createHash('sha256').update(before.source).digest('hex'));
  assert.equal(row.consentVersion, 'code-sharing-v1');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].source, before.source);
  assert.deepEqual(
    Object.keys(calls[0]).sort(),
    ['schemaVersion', 'challenge', 'source', 'evidence'].sort()
  );
  assert.deepEqual(calls[0].evidence, {
    execution: 'timeout',
    passed: 0,
    total: 0,
    technique: 'inconclusive',
  });
  const payload = JSON.stringify(calls[0]);
  for (const forbidden of [
    'Synthetic current draft excluded',
    'synthetic-private-stdout',
    FIXED_REVISION.referenceSource,
    'checkCases',
    'sourceDigest',
    'casesDigest',
  ]) {
    assert.equal(payload.includes(forbidden), false);
  }
  assert.deepEqual(await practice.viewAttempt(attemptId), before);
  assert.equal((await practiceRepository.draft(id)).source, '# Synthetic current draft excluded');
  const reopened = createCoachingService(repository, practiceRepository, setup().client);
  assert.equal(
    (await reopened.status(attemptId)).coaching?.feedback?.summary,
    row.feedback?.summary
  );
  assert.equal((await reopened.status(await submit(await revision()))).coaching, null);
});

test('should dispatch once when concurrent tabs use different request IDs for one attempt', async () => {
  const attemptId = await submit(await revision());
  let release!: () => void;
  let entered!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const { service, calls } = setup(async () => {
    entered();
    await gate;
    return output();
  });
  const id = randomUUID();
  const first = service.start(id, attemptId);
  await started;
  try {
    const second = await service.start(randomUUID(), attemptId);
    assert.equal(second.id, id);
    assert.equal(second.state, 'generating');
    assert.equal(calls.length, 1);
  } finally {
    release();
    await first;
  }
  assert.equal((await service.start(id, attemptId)).state, 'ready');
  assert.equal(calls.length, 1);
  await assert.rejects(
    service.start(id, await submit(await revision())),
    /coaching_identity_conflict/
  );
});

test('should retain exactly two dispatches when interrupted requests and explicit retries are replayed', async () => {
  const attemptId = await submit(await revision());
  const { service, calls } = setup(async () => {
    throw new CoachingCallError('provider_interrupted');
  });
  const row = await service.start(randomUUID(), attemptId);
  assert.equal(row.state, 'interrupted');
  await service.status(attemptId);
  await service.start(randomUUID(), attemptId);
  assert.equal(calls.length, 1);
  await Promise.all([service.retry(row.id), service.retry(row.id)]);
  assert.equal((await service.retry(row.id)).dispatches, 2);
  assert.equal(calls.length, 2);
  assert.deepEqual(
    (await repository.get(row.id)).events.map((event) => event.outcome),
    ['started', 'interrupted', 'started', 'interrupted']
  );
});

test('should preserve old assistance snapshots when coaching becomes ready before later submissions', async () => {
  const id = await revision();
  const source = await submit(id);
  const fake = setup(async () => {
    throw new CoachingCallError('coaching_invalid');
  });
  const failed = await fake.service.start(randomUUID(), source);
  const before = await submit(id);
  assert.equal((await practice.viewAttempt(before)).coachingAvailable, false);
  await setup().service.retry(failed.id);
  const after = await submit(id);
  assert.equal((await practice.viewAttempt(source)).coachingAvailable, false);
  assert.equal((await practice.viewAttempt(before)).coachingAvailable, false);
  assert.equal((await practice.viewAttempt(after)).coachingAvailable, true);
  const other = await submit(await revision());
  assert.equal((await practice.viewAttempt(other)).coachingAvailable, false);
  await assert.rejects(
    pool.query('UPDATE practice_attempts SET coaching_available = false WHERE id = $1', [after]),
    /immutable/
  );
  const saved = await practice.viewAttempt(before);
  await practice.submit({
    apiVersion: 1,
    submissionId: before,
    revisionId: id,
    source: saved.source,
    mode: saved.mode,
  });
  assert.equal((await practice.viewAttempt(before)).coachingAvailable, false);
});

test('should recover stale requests without redispatch when late responses arrive after a reload', async () => {
  const attemptId = await submit(await revision());
  const pending = await repository.start(randomUUID(), attemptId);
  const fake = setup();
  const later = createCoachingService(
    repository,
    practiceRepository,
    fake.client,
    () => pending.row.updatedAt.getTime() + 120_001
  );
  assert.equal((await later.status(attemptId)).coaching?.state, 'interrupted');
  assert.equal(fake.calls.length, 0);
  assert.equal(await repository.finish(pending.row.id, 1, output(), null), false);
  await fake.service.retry(pending.row.id);
  assert.equal(await repository.finish(pending.row.id, 1, output(), null), false);
});

test('should retain accepted feedback and sharing identity when records are mutated or deleted', async () => {
  const attemptId = await submit(await revision());
  const invalid = setup(async () => ({
    ...output(),
    feedback: { ...output().feedback, nextStep: 'def replacement(values): return values' },
  }));
  const failed = await invalid.service.start(randomUUID(), attemptId);
  assert.equal(failed.state, 'failed');
  assert.equal(failed.feedback, null);
  const valid = await setup().service.retry(failed.id);
  assert.equal(valid.state, 'ready');
  for (const clause of [
    "source_digest = repeat('0', 64)",
    "consent_version = 'other'",
    'output = NULL',
    'dispatches = 1',
  ]) {
    await assert.rejects(
      pool.query(`UPDATE practice_coaching_requests SET ${clause} WHERE id = $1`, [failed.id]),
      /immutable/
    );
  }
  await assert.rejects(
    pool.query('DELETE FROM practice_coaching_requests WHERE id = $1', [failed.id]),
    /cannot be deleted/
  );
});

test('should avoid paid dispatch when the selected attempt is incomplete or unknown', async () => {
  const fake = setup();
  const id = await submit(await revision(), false);
  await assert.rejects(fake.service.start(randomUUID(), id), /completed_attempt_required/);
  await assert.rejects(fake.service.status(id), /completed_attempt_required/);
  await assert.rejects(fake.service.start(randomUUID(), randomUUID()), /attempt_not_found/);
  assert.equal(fake.calls.length, 0);
  assert.equal(await repository.forAttempt(id), null);
});

test('should serialize coaching completion with submission when the revision lock is already held', async () => {
  const id = await revision();
  const pending = await repository.start(randomUUID(), await submit(id));
  const gate = await pool.connect();
  await gate.query('BEGIN');
  await gate.query('SELECT id FROM practice_challenge_revisions WHERE id = $1 FOR NO KEY UPDATE', [
    id,
  ]);
  const finish = repository.finish(pending.row.id, 1, output(), null);
  try {
    const deadline = Date.now() + 5000;
    let blocked = false;
    while (!blocked && Date.now() < deadline) {
      const observed = await pool.query<{ waiting: boolean }>(
        "SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%practice_challenge_revisions%') AS waiting"
      );
      blocked = observed.rows[0].waiting;
      if (!blocked) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
    assert.equal(blocked, true);
    assert.equal((await repository.get(pending.row.id)).state, 'generating');
  } finally {
    await gate.query('ROLLBACK');
    gate.release();
    await finish;
  }
  assert.equal((await practice.viewAttempt(await submit(id))).coachingAvailable, true);
});

test('should omit hidden case detail and report text when projecting result evidence for the provider', async () => {
  const id = await revision();
  const saved = await practice.submit({
    apiVersion: 1,
    revisionId: id,
    submissionId: randomUUID(),
    source: 'def positive_even(values): return values',
    mode: 'check',
  });
  const binding = saved.request;
  await practice.complete(saved.attemptId, {
    type: 'result',
    protocolVersion: binding.protocolVersion,
    jobId: binding.jobId,
    revisionId: id,
    sourceDigest: binding.sourceDigest,
    casesDigest: binding.casesDigest,
    runtimeVersion: binding.runtimeVersion,
    cases: binding.cases.map((item) => ({
      id: item.id,
      passed: false,
      actual: null,
      mutated: false,
    })),
    technique: 'inconclusive',
    output: 'synthetic-stdout-not-to-provider',
    error: 'synthetic-error-not-to-provider',
    loadMs: 1,
    executionMs: 1,
  });
  const fake = setup();
  await fake.service.start(randomUUID(), saved.attemptId);

  assert.deepEqual(fake.calls[0].evidence, {
    execution: 'execution_error',
    passed: 0,
    total: binding.cases.length,
    technique: 'inconclusive',
  });
  const payload = JSON.stringify(fake.calls[0]);
  assert.equal(payload.includes('synthetic-stdout-not-to-provider'), false);
  assert.equal(payload.includes('synthetic-error-not-to-provider'), false);
  assert.deepEqual(fake.calls[0].challenge.publicCases, FIXED_REVISION.publicCases);
  assert.equal('cases' in fake.calls[0].evidence, false);
});
