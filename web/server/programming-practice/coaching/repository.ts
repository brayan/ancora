import { and, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { CoachingError, CoachingOutput } from '@ancora/schemas';
import * as schema from '@/server/db/schema';
import { PracticeError } from '@/server/programming-practice/repository';

export function createCoachingRepository(database: NodePgDatabase<typeof schema>) {
  const { practiceCoachingRequests: coaching, practiceRevisions: revisions } = schema;
  const event = (dispatch: number, outcome: string, error?: CoachingError) => ({
    dispatch,
    outcome,
    at: new Date().toISOString(),
    ...(error ? { error } : {}),
  });
  const appendEvent = (dispatch: number, outcome: string, error?: CoachingError) =>
    sql`${coaching.events} || ${JSON.stringify([event(dispatch, outcome, error)])}::jsonb`;

  async function get(id: string) {
    const [row] = await database.select().from(coaching).where(eq(coaching.id, id));
    if (!row) {
      throw new PracticeError('coaching_not_found', 404);
    }
    return row;
  }

  async function forAttempt(attemptId: string) {
    const [row] = await database.select().from(coaching).where(eq(coaching.attemptId, attemptId));
    return row ?? null;
  }

  async function start(id: string, attemptId: string) {
    const [attempt] = await database
      .select()
      .from(schema.practiceAttempts)
      .where(eq(schema.practiceAttempts.id, attemptId));
    if (!attempt) {
      throw new PracticeError('attempt_not_found', 404);
    }
    if (!attempt.report) {
      throw new PracticeError('completed_attempt_required', 409);
    }
    return database.transaction(async (transaction) => {
      await transaction
        .select({ id: revisions.id })
        .from(revisions)
        .where(eq(revisions.id, attempt.revisionId))
        .for('no key update');
      const [identified] = await transaction.select().from(coaching).where(eq(coaching.id, id));
      if (identified) {
        if (identified.attemptId !== attemptId) {
          throw new PracticeError('coaching_identity_conflict', 409);
        }
        return { row: identified, claimed: false };
      }
      const [existing] = await transaction
        .select()
        .from(coaching)
        .where(eq(coaching.attemptId, attemptId));
      if (existing) {
        return { row: existing, claimed: false };
      }

      const [row] = await transaction
        .insert(coaching)
        .values({
          id,
          attemptId,
          revisionId: attempt.revisionId,
          sourceDigest: attempt.sourceDigest,
          consentVersion: 'code-sharing-v1',
          state: 'generating',
          dispatches: 1,
          events: [event(1, 'started')],
          createdAt: sql`clock_timestamp()`,
          updatedAt: sql`clock_timestamp()`,
        })
        .onConflictDoNothing()
        .returning();
      if (!row) {
        throw new PracticeError('coaching_identity_conflict', 409);
      }
      return { row, claimed: true };
    });
  }

  async function retry(id: string) {
    const original = await get(id);
    return database.transaction(async (transaction) => {
      await transaction
        .select({ id: revisions.id })
        .from(revisions)
        .where(eq(revisions.id, original.revisionId))
        .for('no key update');
      const [row] = await transaction.select().from(coaching).where(eq(coaching.id, id));
      // Replaying a lost retry response reads dispatch two; it never spends a third allowance.
      if (row.dispatches === 2) {
        return { row, claimed: false };
      }
      if (!['failed', 'interrupted'].includes(row.state)) {
        throw new PracticeError('coaching_retry_unavailable', 409);
      }
      const [claimed] = await transaction
        .update(coaching)
        .set({
          state: 'generating',
          dispatches: 2,
          error: null,
          updatedAt: sql`clock_timestamp()`,
          events: appendEvent(2, 'started'),
        })
        .where(eq(coaching.id, id))
        .returning();
      return { row: claimed, claimed: true };
    });
  }

  async function finish(
    id: string,
    dispatch: number,
    output: CoachingOutput | null,
    error: CoachingError | null
  ) {
    const original = await get(id);
    return database.transaction(async (transaction) => {
      // Completion shares the attempt/reveal lock, so assistance snapshots have a stable order.
      await transaction
        .select({ id: revisions.id })
        .from(revisions)
        .where(eq(revisions.id, original.revisionId))
        .for('no key update');
      const state = output ? 'ready' : error === 'provider_interrupted' ? 'interrupted' : 'failed';
      const [saved] = await transaction
        .update(coaching)
        .set({
          state,
          output,
          error,
          updatedAt: sql`clock_timestamp()`,
          events: appendEvent(dispatch, state, error ?? undefined),
        })
        .where(
          and(
            eq(coaching.id, id),
            eq(coaching.dispatches, dispatch),
            eq(coaching.state, 'generating')
          )
        )
        .returning();
      return !!saved;
    });
  }

  return { get, forAttempt, start, retry, finish };
}

export type CoachingRepository = ReturnType<typeof createCoachingRepository>;
