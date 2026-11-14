import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readFile, copyFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createPracticeRepository } from '../../server/programming-practice/repository';
import { createPracticeService } from '../../server/programming-practice/service';
import { FIXED_REVISION } from '../../server/programming-practice/fixture';
import { LEGACY_0005, migratePracticeDatabase } from '../../server/db/migrations';
import { jobBinding } from '../../runner/protocol.mjs';
import * as schema from '../../server/db/schema';

assert.equal(
  process.env.ANCORA_SYNTHETIC_DATABASE,
  '1',
  'Use the disposable database test wrapper.'
);
assert.equal(new URL(process.env.DATABASE_URL!).pathname, '/ancora_test');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const repository = createPracticeRepository(drizzle(pool, { schema }));
const service = createPracticeService(repository);
const folder = fileURLToPath(new URL('../../drizzle', import.meta.url));
after(() => pool.end());

test('should return a learner projection when opening the fixed persisted revision', async () => {
  const session = await service.session();
  assert.equal(session.challenge.revisionId, FIXED_REVISION.revisionId);
  assert.equal(session.draft.source, FIXED_REVISION.starterCode);
  assert.equal(session.challenge.publicCases.length, 2);
  assert.equal('referenceSource' in session.challenge, false);
  assert.equal('checkCases' in session.challenge, false);
});

test('should preserve exact drafts and reject stale writes when another tab saves first', async () => {
  const draft = await repository.draft(FIXED_REVISION.revisionId);
  const source = '# Synthetic whitespace\n\ndef positive_even(values):\n    return []\n\n';
  const saved = await service.saveDraft(draft.revisionId, source, draft.version);
  assert.equal(saved.source, source);
  assert.equal(saved.version, draft.version + 1);
  assert.deepEqual(await service.saveDraft(draft.revisionId, source, draft.version), saved);

  await assert.rejects(
    service.saveDraft(draft.revisionId, 'other', draft.version),
    /draft_conflict/
  );
  assert.equal((await repository.draft(draft.revisionId)).source, source);
});

test('should preserve an immutable submitted snapshot when drafts change and completion is retried', async () => {
  const submission = {
    apiVersion: 1 as const,
    revisionId: FIXED_REVISION.revisionId,
    submissionId: randomUUID(),
    source: FIXED_REVISION.referenceSource,
    mode: 'check' as const,
  };
  const envelope = await service.submit(submission);
  assert.equal((await service.submit(submission)).attemptId, envelope.attemptId);
  await assert.rejects(
    service.submit({ ...submission, source: 'different' }),
    /submission_conflict/
  );

  const draft = await repository.draft(submission.revisionId);
  await repository.saveDraft(draft.revisionId, 'newer draft', draft.version);
  const report = {
    ...jobBinding(envelope.request),
    type: 'result' as const,
    cases: envelope.request.cases.map((item) => ({
      id: item.id,
      actual: item.expected,
      passed: true,
      mutated: false,
    })),
    technique: 'passed' as const,
    output: '',
    error: null,
    loadMs: 1,
    executionMs: 1,
  };
  await assert.rejects(
    service.complete(submission.submissionId, { ...report, sourceDigest: '0'.repeat(64) }),
    /invalid_report/
  );
  await assert.rejects(
    service.complete(submission.submissionId, { ...report, cases: report.cases.slice(1) }),
    /invalid_report/
  );
  await service.complete(submission.submissionId, report);
  await service.complete(submission.submissionId, report);
  await assert.rejects(
    service.complete(submission.submissionId, { ...report, output: 'different' }),
    /completion_conflict/
  );

  const saved = await service.viewAttempt(submission.submissionId);
  assert.equal(saved.source, submission.source);
  assert.deepEqual(saved.report, report);
  await assert.rejects(
    pool.query('UPDATE practice_attempts SET source = $1 WHERE id = $2', ['changed', saved.id]),
    /immutable/
  );
  await assert.rejects(
    pool.query('DELETE FROM practice_attempts WHERE id = $1', [saved.id]),
    /cannot be deleted/
  );
});

test('should keep revisions unchanged when edits or deletes are attempted directly in PostgreSQL', async () => {
  await assert.rejects(
    pool.query('UPDATE practice_challenge_revisions SET revision = 2 WHERE id = $1', [
      FIXED_REVISION.revisionId,
    ]),
    /immutable/
  );
  await assert.rejects(
    pool.query('DELETE FROM practice_challenge_revisions WHERE id = $1', [
      FIXED_REVISION.revisionId,
    ]),
    /immutable/
  );
  const revision = await repository.revision(FIXED_REVISION.revisionId);
  assert.deepEqual(revision.content, FIXED_REVISION);

  const next = { ...FIXED_REVISION, revisionId: 'synthetic-positive-even@2' };
  await drizzle(pool, { schema })
    .insert(schema.practiceRevisions)
    .values({
      id: next.revisionId,
      challengeId: revision.challengeId,
      revision: 2,
      content: next,
      contentDigest: createHash('sha256').update(JSON.stringify(next)).digest('hex'),
    });
  assert.deepEqual((await repository.revision(revision.id)).content, FIXED_REVISION);
  assert.equal((await repository.revision(next.revisionId)).revision, 2);
});

test('should retain an unfinished attempt when the browser disappears before reporting', async () => {
  const pending = await service.submit({
    apiVersion: 1,
    revisionId: FIXED_REVISION.revisionId,
    submissionId: randomUUID(),
    source: 'def positive_even(values):\n    return []\n',
    mode: 'examples',
  });
  const reopened = createPracticeService(createPracticeRepository(drizzle(pool, { schema })));
  const saved = await reopened.viewAttempt(pending.attemptId);
  assert.equal(saved.report, null);
  assert.equal(saved.source, pending.request.source);
});

test('should reject unknown ledger entries when a database requires historical review', async () => {
  await pool.query('INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)', [
    'unknown',
    1,
  ]);
  try {
    await assert.rejects(migratePracticeDatabase(pool, folder), /Unknown migration ledger/);
  } finally {
    await pool.query('DELETE FROM drizzle.__drizzle_migrations WHERE hash = $1', ['unknown']);
  }
});

test('should reject a missing retained migration when a later ledger timestamp would skip it', async () => {
  const removed = await pool.query(
    'DELETE FROM drizzle.__drizzle_migrations WHERE id = (SELECT min(id) FROM drizzle.__drizzle_migrations) RETURNING id, hash, created_at'
  );
  try {
    await assert.rejects(migratePracticeDatabase(pool, folder), /Incomplete migration ledger/);
  } finally {
    const row = removed.rows[0];
    await pool.query(
      'INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES ($1, $2, $3)',
      [row.id, row.hash, row.created_at]
    );
  }
});

test('should upgrade the reserved legacy history when the original 0005 was already applied', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'ancora-baseline-'));
  const legacyUrl = new URL(process.env.DATABASE_URL!);
  legacyUrl.pathname = '/ancora_test_legacy';
  await pool.query('CREATE DATABASE ancora_test_legacy');
  const legacy = new Pool({ connectionString: legacyUrl.toString() });
  try {
    await legacy.query('CREATE TABLE decks (id text PRIMARY KEY)');
    await assert.rejects(migratePracticeDatabase(legacy, folder), /no migration ledger/);
    await legacy.query('DROP TABLE decks');

    const journal = JSON.parse(await readFile(path.join(folder, 'meta/_journal.json'), 'utf8'));
    journal.entries = journal.entries.filter((entry: { idx: number }) => entry.idx < 5);
    await mkdir(path.join(temporary, 'meta'));
    await writeFile(path.join(temporary, 'meta/_journal.json'), JSON.stringify(journal));
    for (const entry of journal.entries) {
      await copyFile(
        path.join(folder, entry.tag + '.sql'),
        path.join(temporary, entry.tag + '.sql')
      );
    }
    await migratePracticeDatabase(legacy, temporary);
    const historicalSql = await readFile(
      new URL('./fixtures/legacy-0005.sql', import.meta.url),
      'utf8'
    );
    assert.equal(createHash('sha256').update(historicalSql).digest('hex'), LEGACY_0005.hash);
    await legacy.query(historicalSql);
    await legacy.query(
      'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
      [LEGACY_0005.hash, LEGACY_0005.createdAt]
    );

    await migratePracticeDatabase(legacy, folder);
    await migratePracticeDatabase(legacy, folder);
    const tables = await legacy.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
    );
    assert.ok(tables.rows.some((row: { tablename: string }) => row.tablename === 'decks'));
    assert.ok(
      tables.rows.some((row: { tablename: string }) => row.tablename === 'practice_drafts')
    );
  } finally {
    await legacy.end();
    await pool.query('DROP DATABASE ancora_test_legacy');
    await rm(temporary, { recursive: true, force: true });
  }
});
