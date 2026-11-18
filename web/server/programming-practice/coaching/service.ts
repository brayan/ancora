import { createHash } from 'node:crypto';
import {
  coachingInputSchema,
  coachingOutputSchema,
  coachingStatusSchema,
  coachingViewSchema,
} from '@ancora/schemas';
import type { CoachingRepository } from './repository';
import { CoachingCallError, type CoachingClient } from '@/server/clients/practiceCoaching';
import { PracticeError, type PracticeRepository } from '@/server/programming-practice/repository';

export function createCoachingService(
  repository: CoachingRepository,
  practice: PracticeRepository,
  provider: CoachingClient,
  now: () => number = Date.now
) {
  type CoachingRow = Awaited<ReturnType<CoachingRepository['get']>>;
  const view = (row: CoachingRow) =>
    coachingViewSchema.parse({
      id: row.id,
      attemptId: row.attemptId,
      revisionId: row.revisionId,
      sourceDigest: row.sourceDigest,
      consentVersion: row.consentVersion,
      sharedAt: row.createdAt.toISOString(),
      state: row.state,
      dispatches: row.dispatches,
      feedback: row.output?.feedback ?? null,
      model: row.output?.model ?? null,
      error: row.error,
    });

  async function current(id: string) {
    const row = await repository.get(id);
    if (row.state === 'generating' && now() - row.updatedAt.getTime() > 120_000) {
      await repository.finish(id, row.dispatches, null, 'provider_interrupted');
      return repository.get(id);
    }
    return row;
  }

  async function selected(attemptId: string) {
    const attempt = await practice.attempt(attemptId);
    await practice.usableRevision(attempt.revisionId);
    if (!attempt.report) {
      throw new PracticeError('completed_attempt_required', 409);
    }
    return { ...attempt, report: attempt.report };
  }

  async function dispatch(row: CoachingRow) {
    let phase: 'provider' | 'validation' | 'persistence' = 'provider';
    try {
      const attempt = await selected(row.attemptId);
      if (createHash('sha256').update(attempt.source).digest('hex') !== row.sourceDigest) {
        throw new CoachingCallError('coaching_invalid');
      }
      const { content } = await practice.usableRevision(row.revisionId);
      const report = attempt.report;
      const input = coachingInputSchema.parse({
        schemaVersion: 1,
        challenge: {
          title: content.title,
          objective: content.objective,
          statement: content.statement,
          requirements: content.requirements,
          publicCases: content.publicCases,
          functionContract: content.functionContract ?? {
            name: 'positive_even',
            parameter: { name: 'values', type: 'list[int]' },
            returns: 'list[int]',
          },
          technique: content.technique ?? 'list_comprehension',
        },
        source: attempt.source,
        // Never serialize report text, stdout, hidden values or case identifiers to the provider.
        evidence:
          report.type === 'result'
            ? {
                execution: report.error ? 'execution_error' : 'result',
                passed: report.cases.filter((item) => item.passed).length,
                total: report.cases.length,
                technique: report.technique,
              }
            : { execution: report.code, passed: 0, total: 0, technique: 'inconclusive' },
      });
      const generated = await provider.generate(input);
      phase = 'validation';
      const output = coachingOutputSchema.parse(generated);
      const text = [
        output.feedback.summary,
        ...output.feedback.observations,
        output.feedback.nextStep,
      ].join('\n');
      if (/```|\b(?:async\s+)?def\s+\w+\s*\(/.test(text)) {
        throw new CoachingCallError('coaching_invalid');
      }
      phase = 'persistence';
      await repository.finish(row.id, row.dispatches, output, null);
    } catch (error) {
      const code =
        error instanceof CoachingCallError
          ? error.code
          : phase === 'validation'
            ? 'coaching_invalid'
            : 'provider_interrupted';
      await repository.finish(row.id, row.dispatches, null, code);
    }
    return view(await repository.get(row.id));
  }

  async function start(id: string, attemptId: string) {
    await selected(attemptId);
    const started = await repository.start(id, attemptId);
    return started.claimed ? dispatch(started.row) : view(await current(started.row.id));
  }

  async function retry(id: string) {
    const original = await current(id);
    await selected(original.attemptId);
    const retried = await repository.retry(id);
    return retried.claimed ? dispatch(retried.row) : view(await current(id));
  }

  async function status(attemptId: string) {
    await selected(attemptId);
    const row = await repository.forAttempt(attemptId);
    return coachingStatusSchema.parse({
      apiVersion: 1,
      ...(await provider.status()),
      coaching: row ? view(await current(row.id)) : null,
    });
  }

  return { start, retry, status };
}
