import { integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import type { ChallengeView } from '@ancora/shared-types';
import type { RunnerCase, RunnerResponse } from '@/runner/protocol.mjs';

export type RevisionContent = ChallengeView & {
  referenceSource: string;
  checkCases: RunnerCase[];
  runtimeVersion: string;
  validatorVersion: string;
};

export const practiceChallenges = pgTable('practice_challenges', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const practiceRevisions = pgTable(
  'practice_challenge_revisions',
  {
    id: text('id').primaryKey(),
    challengeId: text('challenge_id')
      .notNull()
      .references(() => practiceChallenges.id),
    revision: integer('revision').notNull(),
    content: jsonb('content').$type<RevisionContent>().notNull(),
    contentDigest: text('content_digest').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('practice_revision_number_unique').on(table.challengeId, table.revision)]
);

export const practiceDrafts = pgTable('practice_drafts', {
  revisionId: text('revision_id')
    .primaryKey()
    .references(() => practiceRevisions.id),
  source: text('source').notNull(),
  version: integer('version').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const practiceAttempts = pgTable('practice_attempts', {
  id: text('id').primaryKey(),
  revisionId: text('revision_id')
    .notNull()
    .references(() => practiceRevisions.id),
  source: text('source').notNull(),
  mode: text('mode').$type<'examples' | 'check'>().notNull(),
  sourceDigest: text('source_digest').notNull(),
  casesDigest: text('cases_digest').notNull(),
  runtimeVersion: text('runtime_version').notNull(),
  report: jsonb('report').$type<RunnerResponse>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});
