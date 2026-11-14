import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import * as schema from '@/server/db/schema';
import { FIXED_REVISION } from '@/server/programming-practice/fixture';
import type { RunnerResponse } from '@/runner/protocol.mjs';

export class PracticeError extends Error {
  constructor(
    public code: string,
    public status = 400
  ) {
    super(code);
  }
}

export function createPracticeRepository(database: NodePgDatabase<typeof schema>) {
  const {
    practiceChallenges: challenges,
    practiceRevisions: revisions,
    practiceDrafts: drafts,
    practiceAttempts: attempts,
  } = schema;
  type NewAttempt = typeof attempts.$inferInsert;

  async function revision(revisionId: string) {
    const [row] = await database.select().from(revisions).where(eq(revisions.id, revisionId));
    if (!row) {
      throw new PracticeError('revision_not_found', 404);
    }
    return row;
  }

  async function initialize() {
    await database.transaction(async (transaction) => {
      await transaction
        .insert(challenges)
        .values({ id: 'synthetic-positive-even' })
        .onConflictDoNothing();
      await transaction
        .insert(revisions)
        .values({
          id: FIXED_REVISION.revisionId,
          challengeId: 'synthetic-positive-even',
          revision: 1,
          content: FIXED_REVISION,
          contentDigest: createHash('sha256').update(JSON.stringify(FIXED_REVISION)).digest('hex'),
        })
        .onConflictDoNothing();
      await transaction
        .insert(drafts)
        .values({
          revisionId: FIXED_REVISION.revisionId,
          source: FIXED_REVISION.starterCode,
        })
        .onConflictDoNothing();
    });

    const saved = await revision(FIXED_REVISION.revisionId);
    if (!isDeepStrictEqual(saved.content, FIXED_REVISION)) {
      throw new PracticeError('revision_content_mismatch', 409);
    }
    return saved;
  }

  async function draft(revisionId: string) {
    const [row] = await database.select().from(drafts).where(eq(drafts.revisionId, revisionId));
    if (!row) {
      throw new PracticeError('draft_not_found', 404);
    }
    return { revisionId: row.revisionId, source: row.source, version: row.version };
  }

  async function saveDraft(revisionId: string, source: string, version: number) {
    const [saved] = await database
      .update(drafts)
      .set({
        source,
        version: sql`${drafts.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(drafts.revisionId, revisionId), eq(drafts.version, version)))
      .returning();
    if (!saved) {
      const current = await draft(revisionId);
      if (current.version === version + 1 && current.source === source) {
        return current;
      }
      throw new PracticeError('draft_conflict', 409);
    }
    return { revisionId: saved.revisionId, source: saved.source, version: saved.version };
  }

  async function attempt(id: string) {
    const [row] = await database.select().from(attempts).where(eq(attempts.id, id));
    if (!row) {
      throw new PracticeError('attempt_not_found', 404);
    }
    return row;
  }

  async function submit(value: NewAttempt) {
    await database.insert(attempts).values(value).onConflictDoNothing();
    const saved = await attempt(value.id);
    for (const key of [
      'revisionId',
      'source',
      'mode',
      'sourceDigest',
      'casesDigest',
      'runtimeVersion',
    ] as const) {
      if (saved[key] !== value[key]) {
        throw new PracticeError('submission_conflict', 409);
      }
    }
    return saved;
  }

  async function complete(id: string, report: RunnerResponse) {
    const [saved] = await database
      .update(attempts)
      .set({ report, completedAt: new Date() })
      .where(and(eq(attempts.id, id), isNull(attempts.report)))
      .returning();
    if (!saved && !isDeepStrictEqual((await attempt(id)).report, report)) {
      throw new PracticeError('completion_conflict', 409);
    }
  }

  async function recent(revisionId: string) {
    return database
      .select()
      .from(attempts)
      .where(eq(attempts.revisionId, revisionId))
      .orderBy(desc(attempts.createdAt), desc(attempts.id))
      .limit(20);
  }

  return { initialize, revision, draft, saveDraft, attempt, submit, complete, recent };
}

export type PracticeRepository = ReturnType<typeof createPracticeRepository>;
