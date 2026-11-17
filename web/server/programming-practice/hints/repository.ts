import { and, asc, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { HintError, HintOutput } from '@ancora/schemas';
import * as schema from '@/server/db/schema';
import { PracticeError } from '@/server/programming-practice/repository';

export function createHintRepository(database: NodePgDatabase<typeof schema>) {
  const { practiceHintRequests: hints, practiceRevisions: revisions } = schema;
  const event = (dispatch: number, outcome: string, error?: HintError) => ({
    dispatch,
    outcome,
    at: new Date().toISOString(),
    ...(error ? { error } : {}),
  });
  const appendEvent = (dispatch: number, outcome: string, error?: HintError) =>
    sql`${hints.events} || ${JSON.stringify([event(dispatch, outcome, error)])}::jsonb`;

  async function get(id: string) {
    const [row] = await database.select().from(hints).where(eq(hints.id, id));
    if (!row) {
      throw new PracticeError('hint_not_found', 404);
    }
    return row;
  }

  async function list(revisionId: string) {
    return database
      .select()
      .from(hints)
      .where(eq(hints.revisionId, revisionId))
      .orderBy(asc(hints.level));
  }

  async function start(id: string, revisionId: string, level: number) {
    return database.transaction(async (transaction) => {
      await transaction
        .select({ id: revisions.id })
        .from(revisions)
        .where(eq(revisions.id, revisionId))
        .for('no key update');
      const [identified] = await transaction.select().from(hints).where(eq(hints.id, id));
      if (identified) {
        if (identified.revisionId !== revisionId || identified.level !== level) {
          throw new PracticeError('hint_identity_conflict', 409);
        }
        return { row: identified, claimed: false };
      }
      const existing = await transaction
        .select()
        .from(hints)
        .where(eq(hints.revisionId, revisionId));
      const same = existing.find((row) => row.level === level);
      if (same) {
        return { row: same, claimed: false };
      }
      const previous = existing.filter((row) => row.level < level && row.state === 'ready');
      if (previous.length !== level - 1) {
        throw new PracticeError('previous_hint_required', 409);
      }

      const [row] = await transaction
        .insert(hints)
        .values({
          id,
          revisionId,
          level,
          state: 'generating',
          dispatches: 1,
          events: [event(1, 'started')],
          createdAt: sql`clock_timestamp()`,
          updatedAt: sql`clock_timestamp()`,
        })
        .onConflictDoNothing()
        .returning();
      if (!row) {
        throw new PracticeError('hint_identity_conflict', 409);
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
      const [row] = await transaction.select().from(hints).where(eq(hints.id, id));
      // Replaying a lost retry response reads dispatch two; it never spends a third allowance.
      if (row.dispatches === 2) {
        return { row, claimed: false };
      }
      if (!['failed', 'interrupted'].includes(row.state)) {
        throw new PracticeError('hint_retry_unavailable', 409);
      }
      const [claimed] = await transaction
        .update(hints)
        .set({
          state: 'generating',
          dispatches: 2,
          error: null,
          updatedAt: sql`clock_timestamp()`,
          events: appendEvent(2, 'started'),
        })
        .where(eq(hints.id, id))
        .returning();
      return { row: claimed, claimed: true };
    });
  }

  async function finish(
    id: string,
    dispatch: number,
    output: HintOutput | null,
    error: HintError | null
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
        .update(hints)
        .set({
          state,
          output,
          error,
          updatedAt: sql`clock_timestamp()`,
          events: appendEvent(dispatch, state, error ?? undefined),
        })
        .where(and(eq(hints.id, id), eq(hints.dispatches, dispatch), eq(hints.state, 'generating')))
        .returning();
      return !!saved;
    });
  }

  return { get, list, start, retry, finish };
}

export type HintRepository = ReturnType<typeof createHintRepository>;
