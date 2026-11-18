import { and, desc, eq, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { createHash, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { restoreReport, sameReport, storeReport } from '../reports';
import type { GenerationRequest } from '@ancora/schemas';
import * as schema from '@/server/db/schema';
import type { RevisionContent } from '@/server/db/schema';
import { PracticeError } from '@/server/programming-practice/repository';
import type { RunnerResponse } from '@/runner/protocol.mjs';

export function createGenerationRepository(database: NodePgDatabase<typeof schema>) {
  const {
    practiceGenerations: generations,
    practiceCandidates: candidates,
    practiceRevisions: revisions,
  } = schema;
  const event = (dispatch: number, outcome: string, error?: string) => ({
    dispatch,
    outcome,
    at: new Date().toISOString(),
    ...(error ? { error } : {}),
  });
  const appendEvent = (dispatch: number, outcome: string, error?: string) =>
    sql`${generations.events} || ${JSON.stringify([event(dispatch, outcome, error)])}::jsonb`;

  async function get(id: string) {
    const [row] = await database.select().from(generations).where(eq(generations.id, id));
    if (!row) {
      throw new PracticeError('generation_not_found', 404);
    }
    return row;
  }

  async function start(id: string, request: GenerationRequest) {
    const [created] = await database
      .insert(generations)
      .values({ id, request, state: 'generating', dispatches: 1, events: [event(1, 'started')] })
      .onConflictDoNothing()
      .returning();
    const row = created ?? (await get(id));
    if (!isDeepStrictEqual(row.request, request)) {
      throw new PracticeError('generation_identity_conflict', 409);
    }
    return { row, created: !!created };
  }

  async function correct(id: string) {
    const [claimed] = await database
      .update(generations)
      .set({
        state: 'generating',
        dispatches: 2,
        error: null,
        events: appendEvent(2, 'started'),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(generations.id, id),
          eq(generations.dispatches, 1),
          inArray(generations.state, ['correction_available', 'interrupted'])
        )
      )
      .returning();
    if (!claimed) {
      throw new PracticeError('correction_not_available', 409);
    }
    return claimed;
  }

  async function fail(id: string, dispatch: number, error: string, interrupted = false) {
    await database
      .update(generations)
      .set({
        state: interrupted ? 'interrupted' : dispatch < 2 ? 'correction_available' : 'rejected',
        error,
        events: appendEvent(dispatch, interrupted ? 'interrupted' : 'invalid', error),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(generations.id, id),
          eq(generations.dispatches, dispatch),
          eq(generations.state, 'generating')
        )
      );
  }

  async function saveCandidate(id: string, dispatch: number, content: RevisionContent) {
    return database.transaction(async (transaction) => {
      const [generation] = await transaction
        .select()
        .from(generations)
        .where(eq(generations.id, id))
        .for('update');
      if (!generation || generation.state !== 'generating' || generation.dispatches !== dispatch) {
        return false;
      }

      const challengeId = `generation:${id}`;
      await transaction
        .insert(schema.practiceChallenges)
        .values({ id: challengeId })
        .onConflictDoNothing();
      await transaction.insert(revisions).values({
        id: content.revisionId,
        challengeId,
        revision: dispatch,
        content,
        contentDigest: createHash('sha256').update(JSON.stringify(content)).digest('hex'),
      });
      await transaction
        .insert(schema.practiceDrafts)
        .values({ revisionId: content.revisionId, source: content.starterCode });
      await transaction.insert(candidates).values({
        revisionId: content.revisionId,
        generationId: id,
        dispatch,
        jobId: randomUUID(),
      });
      await transaction
        .update(generations)
        .set({
          state: 'validating',
          revisionId: content.revisionId,
          model: content.generationMetadata?.model.name,
          events: appendEvent(dispatch, 'candidate'),
          updatedAt: new Date(),
        })
        .where(eq(generations.id, id));
      return true;
    });
  }

  async function candidate(revisionId: string) {
    const [row] = await database
      .select()
      .from(candidates)
      .where(eq(candidates.revisionId, revisionId));
    if (!row) {
      throw new PracticeError('candidate_not_found', 404);
    }
    return { ...row, report: restoreReport(row.report) };
  }

  async function complete(
    id: string,
    revisionId: string,
    report: RunnerResponse,
    approved: boolean
  ) {
    await database.transaction(async (transaction) => {
      const [generation] = await transaction
        .select()
        .from(generations)
        .where(eq(generations.id, id))
        .for('update');
      const [previous] = await transaction
        .select()
        .from(candidates)
        .where(eq(candidates.revisionId, revisionId));
      if (!generation || !previous || previous.generationId !== id) {
        throw new PracticeError('candidate_not_found', 404);
      }
      if (previous.report) {
        if (!sameReport(restoreReport(previous.report), report)) {
          throw new PracticeError('validation_conflict', 409);
        }
        return;
      }
      if (generation.state !== 'validating' || generation.revisionId !== revisionId) {
        throw new PracticeError('validation_stale', 409);
      }

      await transaction
        .update(candidates)
        .set({ report: storeReport(report), approved })
        .where(and(eq(candidates.revisionId, revisionId), isNull(candidates.report)));
      await transaction
        .update(generations)
        .set({
          state: approved
            ? 'ready'
            : generation.dispatches < 2
              ? 'correction_available'
              : 'rejected',
          error: approved ? null : 'reference_failed',
          events: appendEvent(generation.dispatches, approved ? 'validated' : 'reference_failed'),
          updatedAt: new Date(),
        })
        .where(eq(generations.id, id));
    });
  }

  async function latest() {
    const [row] = await database
      .select()
      .from(generations)
      .orderBy(desc(generations.createdAt), desc(generations.id))
      .limit(1);
    return row ?? null;
  }

  async function interruptedValidation(id: string, revisionId: string, dispatch: number) {
    await database
      .update(generations)
      .set({
        error: 'validation_interrupted',
        events: appendEvent(dispatch, 'validation_interrupted'),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(generations.id, id),
          eq(generations.revisionId, revisionId),
          eq(generations.state, 'validating'),
          or(isNull(generations.error), ne(generations.error, 'validation_interrupted'))
        )
      );
  }

  return {
    get,
    start,
    correct,
    fail,
    saveCandidate,
    candidate,
    complete,
    latest,
    interruptedValidation,
  };
}

export type GenerationRepository = ReturnType<typeof createGenerationRepository>;
