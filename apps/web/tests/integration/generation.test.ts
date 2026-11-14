import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  generatorInputSchema,
  generatorOutputSchema,
  type GeneratorInput,
  type GeneratorOutput,
} from '@ancora/schemas';
import { jobBinding, type RunRequest, type RunResult } from '../../runner/protocol.mjs';
import { migratePracticeDatabase } from '../../server/db/migrations';
import * as schema from '../../server/db/schema';
import { FIXED_REVISION } from '../../server/programming-practice/fixture';
import { GeneratorCallError, type GeneratorClient } from '../../server/clients/practiceGenerator';
import { createGenerationRepository } from '../../server/programming-practice/generation/repository';
import { createGenerationService } from '../../server/programming-practice/generation/service';
import { createPracticeRepository } from '../../server/programming-practice/repository';
import { buildRunRequest, createPracticeService } from '../../server/programming-practice/service';

assert.equal(process.env.ANCORA_SYNTHETIC_DATABASE, '1', 'Use the disposable database wrapper.');
const adminUrl = new URL(process.env.DATABASE_URL!);
assert.equal(adminUrl.pathname, '/ancora_test');
assert.equal(adminUrl.hostname, '127.0.0.1');
const admin = new Pool({ connectionString: adminUrl.toString() });
const databaseName = `ancora_generation_${randomUUID().replaceAll('-', '')}`;
assert.match(databaseName, /^[a-z0-9_]+$/);
const databaseUrl = new URL(adminUrl);
databaseUrl.pathname = `/${databaseName}`;
const pool = new Pool({ connectionString: databaseUrl.toString() });
const database = drizzle(pool, { schema });
const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));
let created = false;

const fixtureFile = JSON.parse(
  await readFile(
    new URL('../../../../evals/programming-practice/generation-v1.synthetic.json', import.meta.url),
    'utf8'
  )
) as { fixtures: { input: unknown; output: unknown }[] };
const fixtureInput = generatorInputSchema.parse(fixtureFile.fixtures[0].input);
const fixtureOutput = generatorOutputSchema.parse(fixtureFile.fixtures[0].output);

before(async () => {
  // Only this unique child of the wrapper's disposable database is created or dropped here.
  await admin.query(`CREATE DATABASE ${databaseName}`);
  created = true;
  await migratePracticeDatabase(pool, migrationsFolder);
});

after(async () => {
  await pool.end();
  try {
    if (created) {
      await admin.query(`DROP DATABASE ${databaseName}`);
    }
  } finally {
    await admin.end();
  }
});

function fakeGenerator(
  generate: (input: GeneratorInput) => Promise<GeneratorOutput> = async () => fixtureOutput
) {
  const calls: GeneratorInput[] = [];
  const client: GeneratorClient = {
    status: async () => ({ available: true, model: 'synthetic-offline' }),
    async generate(input) {
      const parsed = generatorInputSchema.parse(input);
      calls.push(parsed);
      return generatorOutputSchema.parse(await generate(parsed));
    },
  };
  return { client, calls };
}

function setup(generator = fakeGenerator(), now?: () => number) {
  const repository = createGenerationRepository(database);
  const practiceRepository = createPracticeRepository(database);
  return {
    ...generator,
    repository,
    practiceRepository,
    practice: createPracticeService(practiceRepository),
    service: createGenerationService(repository, practiceRepository, generator.client, now),
  };
}

function passingReport(request: RunRequest): RunResult {
  return {
    ...jobBinding(request),
    type: 'result',
    cases: request.cases.map((item) => ({
      id: item.id,
      actual: item.expected,
      passed: true,
      mutated: false,
    })),
    technique: request.technique === 'none' ? 'not_required' : 'passed',
    output: '',
    error: null,
    loadMs: 1,
    executionMs: 1,
  };
}

function requireRevision(view: { revisionId: string | null }): string {
  assert.ok(view.revisionId);
  return view.revisionId;
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test('should retain fixed and selected practice when recent generated challenges exceed the selector limit', async () => {
  const { service, practice } = setup();
  await practice.session();
  let earliest = '';
  for (let index = 0; index < 21; index += 1) {
    const id = randomUUID();
    const candidate = await service.start(id, fixtureInput.request);
    const revisionId = requireRevision(candidate);
    const envelope = await service.validation(id);
    await service.complete(id, revisionId, passingReport(envelope.request));
    if (index === 0) {
      earliest = revisionId;
    }
  }

  const reopened = await practice.session(earliest);
  const choices = reopened.challenges ?? [];
  assert.equal(choices.length, 20);
  assert.equal(choices[0].revisionId, FIXED_REVISION.revisionId);
  assert.equal(choices[1].revisionId, earliest);
  assert.equal(reopened.challenge.revisionId, earliest);
  assert.equal((await practice.session(FIXED_REVISION.revisionId)).challenges?.length, 20);
});

test(
  'should claim one dispatch when concurrent starts replay the same generation identity',
  { timeout: 10_000 },
  async () => {
    const entered = deferred();
    const release = deferred();
    const fake = fakeGenerator(async () => {
      entered.resolve();
      await release.promise;
      return fixtureOutput;
    });
    const { service, calls } = setup(fake);
    const id = randomUUID();
    const first = service.start(id, fixtureInput.request);
    await entered.promise;
    const duplicate = await service.start(id, fixtureInput.request);
    assert.equal(duplicate.state, 'generating');
    assert.equal(calls.length, 1);
    release.resolve();

    const started = await first;
    assert.equal(started.state, 'validating');
    assert.deepEqual(await service.start(id, fixtureInput.request), started);
    await assert.rejects(
      service.start(id, { ...fixtureInput.request, goal: 'A different synthetic request' }),
      /generation_identity_conflict/
    );
    assert.equal(calls.length, 1);
  }
);

test('should preserve the active draft until selection when a generated revision becomes ready', async () => {
  const { service, practice, practiceRepository, repository, calls } = setup();
  await practice.session();
  await practice.select(FIXED_REVISION.revisionId);
  const original = await practice.draft(FIXED_REVISION.revisionId);
  const source = '# Synthetic retained draft\n' + FIXED_REVISION.starterCode;
  const retained = await practice.saveDraft(original.revisionId, source, original.version);
  const id = randomUUID();
  const pending = await service.start(id, fixtureInput.request);
  const revisionId = requireRevision(pending);
  assert.equal(pending.state, 'validating');
  assert.equal(pending.title, null);
  await assert.rejects(practice.select(revisionId), /candidate_not_ready/);
  await assert.rejects(
    practice.submit({
      apiVersion: 1,
      revisionId,
      submissionId: randomUUID(),
      source: 'pass',
      mode: 'check',
    }),
    /candidate_not_ready/
  );

  const envelope = await service.validation(id);
  const revision = await practiceRepository.revision(revisionId);
  const ready = await service.complete(id, revisionId, passingReport(envelope.request));
  assert.equal(ready.state, 'ready');
  assert.equal(ready.title, fixtureOutput.draft.title);
  assert.equal((await repository.candidate(revisionId)).approved, true);
  assert.deepEqual(await practice.draft(original.revisionId), retained);
  const beforeSelection = await practice.session();
  assert.equal(beforeSelection.challenge.revisionId, FIXED_REVISION.revisionId);
  assert.ok(beforeSelection.challenges);
  assert.equal(
    beforeSelection.challenges.some((item) => item.revisionId === revisionId),
    true
  );

  const selected = await practice.select(revisionId);
  assert.equal(selected.challenge.revisionId, revisionId);
  assert.equal(selected.draft.source, revision.content.starterCode);
  for (const privateField of [
    'referenceSource',
    'checkCases',
    'generationDraft',
    'generationMetadata',
    'runtimeVersion',
    'validatorVersion',
  ]) {
    assert.equal(privateField in selected.challenge, false);
  }
  assert.deepEqual(await practice.draft(original.revisionId), retained);
  assert.equal(calls.length, 1);
});

test('should reject stale bindings when a reference report belongs to another execution job', async () => {
  const { service, repository } = setup();
  const id = randomUUID();
  const revisionId = requireRevision(await service.start(id, fixtureInput.request));
  const envelope = await service.validation(id);
  const report = passingReport(envelope.request);
  assert.equal(envelope.request.source, fixtureOutput.draft.referenceSource);
  assert.equal(envelope.request.protocolVersion, 2);
  for (const change of [
    { jobId: randomUUID() },
    { revisionId: 'other@1' },
    { sourceDigest: '0'.repeat(64) },
    { casesDigest: '0'.repeat(64) },
    { runtimeVersion: 'other' },
    { protocolVersion: 1 },
    { cases: report.cases.slice(1) },
    { cases: [...report.cases].reverse() },
  ]) {
    await assert.rejects(
      service.complete(id, revisionId, { ...report, ...change }),
      /invalid_report/
    );
  }
  await assert.rejects(service.complete(id, 'other@1', report), /validation_stale/);
  assert.equal((await repository.candidate(revisionId)).report, null);
  assert.equal((await service.get(id)).state, 'validating');
});

test('should retain the first report and candidate identity when completion is replayed or altered', async () => {
  const { service, repository, practiceRepository } = setup();
  const id = randomUUID();
  const revisionId = requireRevision(await service.start(id, fixtureInput.request));
  const envelope = await service.validation(id);
  const report = passingReport(envelope.request);
  const original = await practiceRepository.revision(revisionId);
  await service.complete(id, revisionId, report);
  await service.complete(id, revisionId, report);
  await assert.rejects(
    service.complete(id, revisionId, { ...report, output: 'altered' }),
    /validation_conflict/
  );

  for (const [statement, values] of [
    [
      'UPDATE practice_generation_candidates SET job_id = $1 WHERE revision_id = $2',
      [randomUUID(), revisionId],
    ],
    [
      'UPDATE practice_generation_candidates SET report = $1::jsonb WHERE revision_id = $2',
      [JSON.stringify({ ...report, output: 'altered' }), revisionId],
    ],
    [
      'UPDATE practice_generation_candidates SET approved = false WHERE revision_id = $1',
      [revisionId],
    ],
    ['DELETE FROM practice_generation_candidates WHERE revision_id = $1', [revisionId]],
    [
      'UPDATE practice_challenge_revisions SET content = $1::jsonb WHERE id = $2',
      [JSON.stringify({ ...original.content, title: 'altered' }), revisionId],
    ],
  ] as const) {
    await assert.rejects(pool.query(statement, [...values]), /immutable|cannot be deleted/);
  }
  assert.deepEqual((await repository.candidate(revisionId)).report, report);
  assert.deepEqual((await practiceRepository.revision(revisionId)).content, original.content);
});

test('should resume interrupted validation when stopping or bootstrap failure leaves a candidate pending', async () => {
  const { service, repository, calls, client } = setup();
  const id = randomUUID();
  const revisionId = requireRevision(await service.start(id, fixtureInput.request));
  const envelope = await service.validation(id);
  for (const code of [
    'stopped',
    'bootstrap_error',
    'execution_error',
    'invalid_message',
  ] as const) {
    const pending = await service.complete(id, revisionId, {
      ...jobBinding(envelope.request),
      type: 'failure',
      code,
      output: '',
    });
    assert.equal(pending.state, 'validating');
    assert.equal(pending.error, 'validation_interrupted');
    assert.equal((await repository.candidate(revisionId)).report, null);
    assert.deepEqual((await service.validation(id)).request, envelope.request);
  }

  const reopened = setup({ client, calls });
  assert.deepEqual((await reopened.service.validation(id)).request, envelope.request);
  assert.equal((await reopened.service.get(id)).state, 'validating');
  assert.equal(calls.length, 1);
  assert.equal(
    (await reopened.service.complete(id, revisionId, passingReport(envelope.request))).state,
    'ready'
  );
});

test(
  'should permit one explicit correction when reference validation fails and preserve both immutable revisions',
  { timeout: 10_000 },
  async () => {
    const correctionEntered = deferred();
    const releaseCorrection = deferred();
    let count = 0;
    const fake = fakeGenerator(async () => {
      ++count;
      if (count === 2) {
        correctionEntered.resolve();
        await releaseCorrection.promise;
        return {
          ...fixtureOutput,
          draft: { ...fixtureOutput.draft, title: 'Synthetic corrected candidate' },
        };
      }
      return fixtureOutput;
    });
    const { service, repository, practiceRepository, calls } = setup(fake);
    const id = randomUUID();
    const firstRevision = requireRevision(await service.start(id, fixtureInput.request));
    const firstContent = (await practiceRepository.revision(firstRevision)).content;
    const firstEnvelope = await service.validation(id);
    const failed = { ...passingReport(firstEnvelope.request), technique: 'failed' as const };
    const rejectedReference = await service.complete(id, firstRevision, failed);
    assert.equal(rejectedReference.state, 'correction_available');
    assert.equal(calls.length, 1);
    assert.deepEqual((await repository.candidate(firstRevision)).report, failed);

    const correction = service.correct(id);
    await correctionEntered.promise;
    await assert.rejects(service.correct(id), /correction_not_available/);
    releaseCorrection.resolve();
    const corrected = await correction;
    const secondRevision = requireRevision(corrected);
    assert.notEqual(firstRevision, secondRevision);
    assert.equal(corrected.dispatches, 2);
    assert.equal(corrected.state, 'validating');
    assert.deepEqual(calls[1].previous, fixtureOutput.draft);
    assert.deepEqual(calls[1].feedback, ['reference_failed']);
    assert.deepEqual((await practiceRepository.revision(firstRevision)).content, firstContent);
    assert.deepEqual((await repository.candidate(firstRevision)).report, failed);
    await assert.rejects(service.complete(id, firstRevision, failed), /validation_stale/);

    const secondEnvelope = await service.validation(id);
    const secondFailure = {
      ...passingReport(secondEnvelope.request),
      cases: secondEnvelope.request.cases.map((item) => ({
        id: item.id,
        actual: null,
        passed: false,
        mutated: false,
      })),
    };
    assert.equal((await service.complete(id, secondRevision, secondFailure)).state, 'rejected');
    await assert.rejects(service.correct(id), /correction_not_available/);
    await service.get(id);
    await service.latest();
    assert.equal(calls.length, 2);
  }
);

test('should consume uncertain dispatches when a provider call fails without retrying on reopen', async () => {
  const fake = fakeGenerator(async () => {
    throw new GeneratorCallError('provider_interrupted');
  });
  const { service, calls, client, repository } = setup(fake);
  const id = randomUUID();
  const interrupted = await service.start(id, fixtureInput.request);
  assert.equal(interrupted.state, 'interrupted');
  assert.equal(interrupted.dispatches, 1);
  assert.equal(interrupted.revisionId, null);
  const reopened = setup({ client, calls });
  await reopened.service.get(id);
  await reopened.service.latest();
  await reopened.service.status();
  await reopened.service.start(id, fixtureInput.request);
  assert.equal(calls.length, 1);
  await assert.rejects(reopened.service.validation(id), /validation_not_available/);

  const exhausted = await reopened.service.correct(id);
  assert.equal(exhausted.state, 'interrupted');
  assert.equal(exhausted.dispatches, 2);
  await assert.rejects(reopened.service.correct(id), /correction_not_available/);
  assert.equal(calls.length, 2);
  const stored = await repository.get(id);
  assert.deepEqual(
    stored.events.map((event) => event.outcome),
    ['started', 'interrupted', 'started', 'interrupted']
  );
});

test('should interrupt stale generating reservations when opening a generation after a lost dispatch', async () => {
  const normal = setup();
  const id = randomUUID();
  const reserved = await normal.repository.start(id, fixtureInput.request);
  const stale = setup(fakeGenerator(), () => reserved.row.updatedAt.getTime() + 120_001);
  const interrupted = await stale.service.get(id);
  assert.equal(interrupted.state, 'interrupted');
  assert.equal(interrupted.error, 'provider_interrupted');
  assert.equal(interrupted.dispatches, 1);
  assert.equal(stale.calls.length, 0);
  assert.equal((await stale.service.start(id, fixtureInput.request)).state, 'interrupted');
  assert.equal(stale.calls.length, 0);

  const corrected = await stale.service.correct(id);
  assert.equal(corrected.state, 'validating');
  assert.equal(corrected.dispatches, 2);
  assert.equal(stale.calls.length, 1);
});

test('should retain fixed drafts attempts and migration ledger when upgrading from 0006 to 0007', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'ancora-generation-upgrade-'));
  const name = `ancora_upgrade_${randomUUID().replaceAll('-', '')}`;
  assert.match(name, /^[a-z0-9_]+$/);
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  await admin.query(`CREATE DATABASE ${name}`);
  const upgrade = new Pool({ connectionString: url.toString() });
  try {
    const journal = JSON.parse(
      await readFile(path.join(migrationsFolder, 'meta/_journal.json'), 'utf8')
    ) as { entries: { idx: number; tag: string }[] };
    journal.entries = journal.entries.filter((entry) => entry.idx <= 6);
    await mkdir(path.join(temporary, 'meta'));
    await writeFile(path.join(temporary, 'meta/_journal.json'), JSON.stringify(journal));
    for (const entry of journal.entries) {
      await copyFile(
        path.join(migrationsFolder, `${entry.tag}.sql`),
        path.join(temporary, `${entry.tag}.sql`)
      );
    }
    await migratePracticeDatabase(upgrade, temporary);
    const old = createPracticeRepository(drizzle(upgrade, { schema }));
    await old.initialize();
    const originalDraft = await old.draft(FIXED_REVISION.revisionId);
    const draft = await old.saveDraft(
      originalDraft.revisionId,
      '# Synthetic draft before 0007\n',
      originalDraft.version
    );
    const attemptId = randomUUID();
    const request = buildRunRequest(
      FIXED_REVISION,
      FIXED_REVISION.referenceSource,
      'check',
      attemptId
    );
    await old.submit({
      id: attemptId,
      revisionId: FIXED_REVISION.revisionId,
      source: request.source,
      mode: 'check',
      sourceDigest: request.sourceDigest,
      casesDigest: request.casesDigest,
      runtimeVersion: request.runtimeVersion,
    });
    await old.complete(attemptId, passingReport(request));
    const attempt = await old.attempt(attemptId);
    const ledger = await upgrade.query<{ hash: string; created_at: string }>(
      'SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at'
    );

    await migratePracticeDatabase(upgrade, migrationsFolder);
    await migratePracticeDatabase(upgrade, migrationsFolder);
    const upgraded = createPracticeService(createPracticeRepository(drizzle(upgrade, { schema })));
    assert.deepEqual(await upgraded.draft(FIXED_REVISION.revisionId), draft);
    assert.deepEqual(await old.attempt(attemptId), attempt);
    assert.deepEqual((await old.revision(FIXED_REVISION.revisionId)).content, FIXED_REVISION);
    const upgradedLedger = await upgrade.query<{ hash: string; created_at: string }>(
      'SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at'
    );
    assert.deepEqual(upgradedLedger.rows.slice(0, ledger.rows.length), ledger.rows);
    assert.equal(upgradedLedger.rows.length, ledger.rows.length + 1);
    assert.equal((await upgraded.session()).challenge.revisionId, FIXED_REVISION.revisionId);
  } finally {
    await upgrade.end();
    try {
      await admin.query(`DROP DATABASE ${name}`);
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  }
});

test('should withhold invalid candidates when provider metadata contradicts the requested concept', async () => {
  let dispatch = 0;
  const fake = fakeGenerator(async () => {
    ++dispatch;
    return dispatch === 1
      ? { ...fixtureOutput, draft: { ...fixtureOutput.draft, concept: 'strings' } }
      : fixtureOutput;
  });
  const { service, practiceRepository, calls } = setup(fake);
  const id = randomUUID();
  const invalid = await service.start(id, fixtureInput.request);
  assert.equal(invalid.state, 'correction_available');
  assert.equal(invalid.error, 'draft_invalid');
  assert.equal(invalid.revisionId, null);
  await assert.rejects(practiceRepository.revision(`${id}@1`), /revision_not_found/);
  await service.get(id);
  assert.equal(calls.length, 1);

  const corrected = await service.correct(id);
  assert.equal(corrected.state, 'validating');
  assert.equal(corrected.dispatches, 2);
  assert.equal(calls[1].previous, null);
  assert.equal(calls.length, 2);
});

test('should reject self-reported success when actual values contradict reference expectations', async () => {
  const { service, repository } = setup();
  const id = randomUUID();
  const revisionId = requireRevision(await service.start(id, fixtureInput.request));
  const envelope = await service.validation(id);
  const report = passingReport(envelope.request);
  report.cases[0] = { ...report.cases[0], actual: [999], passed: true };
  const failed = await service.complete(id, revisionId, report);

  assert.equal(failed.state, 'correction_available');
  assert.equal(failed.error, 'reference_failed');
  assert.equal((await repository.candidate(revisionId)).approved, false);
});

test('should reject forged ordered success when dictionary result keys change insertion order', async () => {
  const fixture = fixtureFile.fixtures
    .map((item) => ({
      input: generatorInputSchema.parse(item.input),
      output: generatorOutputSchema.parse(item.output),
    }))
    .find((item) => item.input.request.concept === 'dictionaries');
  assert.ok(fixture);
  const output = structuredClone(fixture.output);
  output.draft.publicCases[1].inputJson = '{"first":1,"second":2}';
  output.draft.publicCases[1].expectedJson = output.draft.publicCases[1].inputJson;
  const { service } = setup(fakeGenerator(async () => output));
  const id = randomUUID();
  const candidate = await service.start(id, fixture.input.request);
  const revisionId = requireRevision(candidate);
  const envelope = await service.validation(id);
  const report = passingReport(envelope.request);
  const index = envelope.request.cases.findIndex((item) => Object.keys(item.expected).length > 1);
  assert.ok(index >= 0);
  const expected = envelope.request.cases[index].expected;
  assert.ok(typeof expected === 'object' && expected !== null && !Array.isArray(expected));
  report.cases[index] = {
    ...report.cases[index],
    actual: Object.fromEntries(Object.entries(expected).reverse()),
  };

  const result = await service.complete(id, revisionId, report);
  assert.equal(result.state, 'correction_available');
});

test('should preserve dictionary cases and reports when immutable data is read back from JSONB', async () => {
  const fixture = fixtureFile.fixtures
    .map((item) => ({
      input: generatorInputSchema.parse(item.input),
      output: generatorOutputSchema.parse(item.output),
    }))
    .find((item) => item.input.request.concept === 'dictionaries');
  assert.ok(fixture);
  const output = structuredClone(fixture.output);
  const example = output.draft.publicCases[1];
  example.inputJson = '{"long-first":1,"b":2}';
  example.expectedJson = example.inputJson;
  const { service, practice, repository } = setup(fakeGenerator(async () => output));
  const id = randomUUID();
  const revisionId = requireRevision(await service.start(id, fixture.input.request));

  const envelope = await service.validation(id);
  const restored = envelope.request.cases.find((item) => item.id === example.id);
  assert.ok(restored);
  assert.deepEqual(Object.keys(restored.input), ['long-first', 'b']);
  assert.deepEqual(Object.keys(restored.expected), ['long-first', 'b']);
  const report = passingReport(envelope.request);
  await service.complete(id, revisionId, report);
  await service.complete(id, revisionId, report);
  const savedReport = (await repository.candidate(revisionId)).report;
  assert.ok(savedReport?.type === 'result');
  assert.deepEqual(Object.keys(savedReport.cases[1].actual!), ['long-first', 'b']);
  const learner = await practice.session(revisionId);
  assert.deepEqual(Object.keys(learner.challenge.publicCases[1].input), ['long-first', 'b']);

  const submission = await practice.submit({
    apiVersion: 1,
    revisionId,
    submissionId: randomUUID(),
    source: output.draft.referenceSource,
    mode: 'check',
  });
  const attemptReport = passingReport(submission.request);
  await practice.complete(submission.attemptId, attemptReport);
  await practice.complete(submission.attemptId, attemptReport);
  const savedAttempt = await practice.viewAttempt(submission.attemptId);
  assert.ok(savedAttempt.report?.type === 'result');
  assert.deepEqual(Object.keys(savedAttempt.report.cases[1].actual!), ['long-first', 'b']);

  const reordered = { ...report, cases: [...report.cases] };
  reordered.cases[1] = { ...report.cases[1], actual: { b: 2, 'long-first': 1 } };
  await assert.rejects(service.complete(id, revisionId, reordered), /validation_conflict/);
  const changedAttempt = { ...attemptReport, cases: [...attemptReport.cases] };
  changedAttempt.cases[1] = { ...changedAttempt.cases[1], actual: { b: 2, 'long-first': 1 } };
  await assert.rejects(
    practice.complete(submission.attemptId, changedAttempt),
    /completion_conflict/
  );
});
