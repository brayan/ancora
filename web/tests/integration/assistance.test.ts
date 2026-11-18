import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createPracticeRepository } from '../../server/programming-practice/repository';
import { createPracticeService } from '../../server/programming-practice/service';
import { FIXED_REVISION } from '../../server/programming-practice/fixture';
import * as schema from '../../server/db/schema';

assert.equal(process.env.ANCORA_SYNTHETIC_DATABASE, '1', 'Use the disposable database wrapper.');
assert.equal(new URL(process.env.DATABASE_URL!).pathname, '/ancora_test');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const database = drizzle(pool, { schema });
const repository = createPracticeRepository(database);
const service = createPracticeService(repository);
after(() => pool.end());

async function revision() {
  const id = `synthetic-assistance:${randomUUID()}`;
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
    source: FIXED_REVISION.starterCode,
    mode: 'check' as const,
  };
}

test('should retain the draft and first reveal time when a solution is reopened or retried', async () => {
  const id = await revision();
  const before = await repository.draft(id);
  assert.equal((await service.session(id)).solutionRevealedAt, null);
  const envelope = await service.reference(id);
  const first = await repository.solutionRevealedAt(id);
  assert.ok(first);
  assert.equal(envelope.request.source, FIXED_REVISION.referenceSource);
  assert.equal(envelope.attemptId, null);
  await service.reference(id);

  const reopened = createPracticeService(createPracticeRepository(drizzle(pool, { schema })));
  const session = await reopened.session(id);
  assert.equal(session.solutionRevealedAt, first);
  assert.deepEqual(session.draft, before);
  assert.equal(session.attempts.length, 0);
  assert.equal('referenceSource' in session.challenge, false);
  assert.equal('checkCases' in session.challenge, false);
});

test('should preserve each assistance snapshot when a reveal follows an earlier submission', async () => {
  const id = await revision();
  const before = submission(id);
  await service.submit(before);
  assert.equal((await service.viewAttempt(before.submissionId)).solutionRevealed, false);

  await service.reference(id);
  await service.submit(before);
  const after = submission(id);
  await service.submit(after);
  assert.equal((await service.viewAttempt(before.submissionId)).solutionRevealed, false);
  assert.equal((await service.viewAttempt(after.submissionId)).solutionRevealed, true);
  const session = await service.session(id);
  assert.equal(
    session.attempts.find((item) => item.id === before.submissionId)?.solutionRevealed,
    false
  );
  assert.equal(
    session.attempts.find((item) => item.id === after.submissionId)?.solutionRevealed,
    true
  );
  await assert.rejects(
    pool.query('UPDATE practice_attempts SET solution_revealed = true WHERE id = $1', [
      before.submissionId,
    ]),
    /immutable/
  );
});

test('should isolate recorded assistance when another revision has not been revealed', async () => {
  const revealed = await revision();
  const untouched = await revision();
  await service.reference(revealed);
  const attempt = await service.submit(submission(untouched));
  assert.equal((await service.session(untouched)).solutionRevealedAt, null);
  assert.equal((await service.viewAttempt(attempt.attemptId)).solutionRevealed, false);
});

test('should protect the first reveal when database writes attempt to modify or remove it', async () => {
  const id = await revision();
  await service.reference(id);
  await assert.rejects(
    pool.query('UPDATE practice_solution_reveals SET created_at = now() WHERE revision_id = $1', [
      id,
    ]),
    /immutable/
  );
  await assert.rejects(
    pool.query('DELETE FROM practice_solution_reveals WHERE revision_id = $1', [id]),
    /immutable/
  );
  await assert.rejects(service.reference('synthetic-missing-revision'), /revision_not_found/);
});

test('should withhold source when the reveal record cannot be persisted', async () => {
  const id = await revision();
  const unavailable = createPracticeService({
    ...repository,
    recordSolutionReveal: async () => {
      throw new Error('Synthetic storage failure');
    },
  });
  await assert.rejects(unavailable.reference(id), /Synthetic storage failure/);
  assert.equal(await repository.solutionRevealedAt(id), null);
  assert.equal((await repository.draft(id)).source, FIXED_REVISION.starterCode);
});

test('should serialize assistance across tabs when reveal and submission wait on the same revision', async () => {
  const id = await revision();
  const gate = await pool.connect();
  await gate.query('BEGIN');
  await gate.query('SELECT id FROM practice_challenge_revisions WHERE id = $1 FOR NO KEY UPDATE', [
    id,
  ]);
  const reveal = service.reference(id);
  const attempt = submission(id);
  const submit = service.submit(attempt);
  try {
    // Wait for both product transactions to reach the lock; no timing-based assumption about arrival.
    const deadline = Date.now() + 5_000;
    let waiting = 0;
    while (waiting < 2 && Date.now() < deadline) {
      // Read outside the gate transaction so PostgreSQL refreshes its activity snapshot.
      const rows = await pool.query<{ count: string }>(
        "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%practice_challenge_revisions%'"
      );
      waiting = Number(rows.rows[0].count);
      if (waiting < 2) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
    assert.equal(waiting, 2);
  } finally {
    await gate.query('ROLLBACK');
    gate.release();
    await Promise.all([reveal, submit]);
  }

  const saved = await service.viewAttempt(attempt.submissionId);
  const first = await repository.solutionRevealedAt(id);
  assert.ok(first);
  // Either arrival order is valid. A replay after both finish must retain the accepted order.
  await service.submit(attempt);
  assert.equal(
    (await service.viewAttempt(attempt.submissionId)).solutionRevealed,
    saved.solutionRevealed
  );
  const next = await service.submit(submission(id));
  assert.equal((await service.viewAttempt(next.attemptId)).solutionRevealed, true);
});
