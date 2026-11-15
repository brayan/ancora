import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { HintInput, HintOutput } from '@ancora/schemas';
import * as schema from '../../server/db/schema';
import { createPracticeRepository } from '../../server/programming-practice/repository';
import { createPracticeService } from '../../server/programming-practice/service';
import { createHintRepository } from '../../server/programming-practice/hints/repository';
import { createHintService } from '../../server/programming-practice/hints/service';
import { HintCallError, type HintClient } from '../../server/clients/practiceHints';
import { FIXED_REVISION } from '../../server/programming-practice/fixture';
import { migratePracticeDatabase } from '../../server/db/migrations';

assert.equal(process.env.ANCORA_SYNTHETIC_DATABASE, '1', 'Use the disposable database wrapper.');
assert.equal(new URL(process.env.DATABASE_URL!).pathname, '/ancora_test');
const admin = new Pool({ connectionString: process.env.DATABASE_URL });
const name = `ancora_hints_${randomUUID().replaceAll('-', '')}`;
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
const repository = createHintRepository(database);
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

function output(level: number): HintOutput {
  return {
    schemaVersion: 1,
    hint: { level, content: `Synthetic hint level ${level}: think through the public examples.` },
    model: {
      provider: 'openai',
      name: 'synthetic-offline',
      promptVersion: 'programming-hints-v1',
      schemaVersion: 1,
    },
  };
}

function setup(
  generate: (input: HintInput) => Promise<HintOutput> = async (input) => output(input.level)
) {
  const calls: HintInput[] = [];
  const client: HintClient = {
    status: async () => ({ available: true, model: 'synthetic-offline' }),
    generate: async (input) => {
      calls.push(input);
      return generate(input);
    },
  };
  return { calls, client, service: createHintService(repository, practiceRepository, client) };
}

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

function submission(revisionId: string) {
  return {
    apiVersion: 1 as const,
    revisionId,
    submissionId: randomUUID(),
    source: '# Synthetic private learner canary\n' + FIXED_REVISION.starterCode,
    mode: 'check' as const,
  };
}

test('should save progressive hints without private context when each preceding level is ready', async () => {
  const { service, calls } = setup();
  const id = await revision();
  const before = await practiceRepository.draft(id);
  await assert.rejects(service.start(randomUUID(), id, 2), /previous_hint_required/);
  for (const level of [1, 2, 3]) {
    const hint = await service.start(randomUUID(), id, level);
    assert.equal(hint.state, 'ready');
    assert.equal(hint.level, level);
    assert.equal(calls[level - 1].previousHints.length, level - 1);
  }
  assert.equal(calls.length, 3);
  for (const call of calls) {
    assert.deepEqual(
      Object.keys(call.challenge).sort(),
      [
        'title',
        'objective',
        'statement',
        'requirements',
        'publicCases',
        'functionContract',
        'technique',
      ].sort()
    );
    assert.equal(JSON.stringify(call).includes('Synthetic private learner canary'), false);
    assert.equal(JSON.stringify(call).includes(FIXED_REVISION.referenceSource), false);
  }
  assert.deepEqual(await practiceRepository.draft(id), before);
  const reopened = createHintService(repository, practiceRepository, setup().client);
  assert.equal((await reopened.status(id)).hints.length, 3);
  assert.equal((await reopened.status(await revision())).hints.length, 0);
});

test('should claim one initial dispatch when concurrent tabs request the same level with different IDs', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const { service, calls } = setup(async (input) => {
    entered();
    await gate;
    return output(input.level);
  });
  const revisionId = await revision();
  const id = randomUUID();
  const initial = service.start(id, revisionId, 1);
  await started;
  try {
    const replay = await service.start(randomUUID(), revisionId, 1);
    assert.equal(replay.id, id);
    assert.equal(replay.state, 'generating');
    assert.equal(calls.length, 1);
  } finally {
    release();
    await initial;
  }
  assert.equal((await service.start(id, revisionId, 1)).state, 'ready');
  assert.equal(calls.length, 1);
  await assert.rejects(service.start(id, await revision(), 1), /hint_identity_conflict/);
});

test('should retain two failed dispatches when explicit retry is replayed without another allowance', async () => {
  const { service, calls } = setup(async () => {
    throw new HintCallError('provider_interrupted');
  });
  const revisionId = await revision();
  const id = randomUUID();
  assert.equal((await service.start(id, revisionId, 1)).state, 'interrupted');
  await service.status(revisionId);
  await service.start(id, revisionId, 1);
  assert.equal(calls.length, 1);
  const [first, second] = await Promise.all([service.retry(id), service.retry(id)]);
  assert.equal(first.dispatches, 2);
  assert.equal(second.dispatches, 2);
  assert.equal((await service.retry(id)).state, 'interrupted');
  assert.equal(calls.length, 2);
  const row = await repository.get(id);
  assert.equal(row.events.length, 4);
  assert.deepEqual(
    row.events.map((event) => event.outcome),
    ['started', 'interrupted', 'started', 'interrupted']
  );
});

test('should preserve assistance snapshots when pending hints fail and a retry later succeeds', async () => {
  const id = await revision();
  let calls = 0;
  const { service } = setup(async (input) => {
    ++calls;
    if (calls === 1) {
      throw new HintCallError('hint_invalid');
    }
    return output(input.level);
  });
  const initial = submission(id);
  await practice.submit(initial);
  const hint = await service.start(randomUUID(), id, 1);
  assert.equal(hint.state, 'failed');
  const failed = submission(id);
  await practice.submit(failed);
  await service.retry(hint.id);
  const assisted = submission(id);
  await practice.submit(assisted);
  await service.start(randomUUID(), id, 2);
  await practice.submit(assisted);
  assert.equal((await practice.viewAttempt(initial.submissionId)).hintLevel, 0);
  assert.equal((await practice.viewAttempt(failed.submissionId)).hintLevel, 0);
  assert.equal((await practice.viewAttempt(assisted.submissionId)).hintLevel, 1);
  const after = await practice.submit(submission(id));
  assert.equal((await practice.viewAttempt(after.attemptId)).hintLevel, 2);
  assert.equal((await practice.viewAttempt(after.attemptId)).solutionRevealed, false);
  await assert.rejects(
    pool.query('UPDATE practice_attempts SET hint_level = 0 WHERE id = $1', [after.attemptId]),
    /immutable/
  );
});

test('should interrupt a stale reservation without dispatch when a later response tries to overwrite recovery', async () => {
  const id = await revision();
  const saved = await repository.start(randomUUID(), id, 1);
  const fake = setup();
  const later = createHintService(
    repository,
    practiceRepository,
    fake.client,
    () => saved.row.updatedAt.getTime() + 120_001
  );
  const reopened = await later.status(id);
  assert.equal(reopened.hints[0].state, 'interrupted');
  assert.equal(fake.calls.length, 0);
  assert.equal(await repository.finish(saved.row.id, 1, output(1), null), false);
  await fake.service.retry(saved.row.id);
  assert.equal(await repository.finish(saved.row.id, 1, output(1), null), false);
  assert.equal((await repository.get(saved.row.id)).dispatches, 2);
});

test('should withhold invalid output and protect accepted hints when mutation is attempted', async () => {
  const id = await revision();
  const invalid = setup(async () => ({
    ...output(1),
    hint: { level: 2, content: '```python\nreturn []\n```' },
  }));
  const row = await invalid.service.start(randomUUID(), id, 1);
  assert.equal(row.state, 'failed');
  assert.equal(row.content, null);
  const valid = setup();
  await valid.service.retry(row.id);
  await assert.rejects(
    pool.query('UPDATE practice_hint_requests SET level = 3 WHERE id = $1', [row.id]),
    /immutable/
  );
  await assert.rejects(
    pool.query('UPDATE practice_hint_requests SET output = NULL WHERE id = $1', [row.id]),
    /immutable/
  );
  await assert.rejects(
    pool.query('DELETE FROM practice_hint_requests WHERE id = $1', [row.id]),
    /cannot be deleted/
  );
  assert.equal((await valid.service.start(randomUUID(), id, 1)).id, row.id);
  assert.equal(valid.calls.length, 1);
});

test('should hold hint completion behind the revision lock when assistance is committed with attempt ordering', async () => {
  const id = await revision();
  const pending = await repository.start(randomUUID(), id, 1);
  const gate = await pool.connect();
  await gate.query('BEGIN');
  await gate.query('SELECT id FROM practice_challenge_revisions WHERE id = $1 FOR NO KEY UPDATE', [
    id,
  ]);
  const finish = repository.finish(pending.row.id, 1, output(1), null);
  try {
    const deadline = Date.now() + 5_000;
    let blocked = false;
    while (!blocked && Date.now() < deadline) {
      const query = await pool.query<{ waiting: boolean }>(
        "SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%practice_challenge_revisions%') AS waiting"
      );
      blocked = query.rows[0].waiting;
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
  const attempt = await practice.submit(submission(id));
  assert.equal((await practice.viewAttempt(attempt.attemptId)).hintLevel, 1);
});

test('should reject unready revisions before dispatch when an immutable candidate has not passed validation', async () => {
  const id = await revision();
  const generationId = randomUUID();
  await database.insert(schema.practiceGenerations).values({
    id: generationId,
    revisionId: id,
    state: 'validating',
    dispatches: 1,
    events: [],
    request: {
      language: 'python',
      concept: 'collections',
      difficulty: 'beginner',
      goal: 'Synthetic practice',
      targetMinutes: 10,
      preferences: '',
    },
  });
  await database
    .insert(schema.practiceCandidates)
    .values({ revisionId: id, generationId, dispatch: 1, jobId: randomUUID() });
  const { service, calls } = setup();
  await assert.rejects(service.start(randomUUID(), id, 1), /candidate_not_ready/);
  await assert.rejects(service.status(id), /candidate_not_ready/);
  assert.equal(calls.length, 0);
  assert.equal((await repository.list(id)).length, 0);
});
