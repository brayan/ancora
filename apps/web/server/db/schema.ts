import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type {
  ChallengeDraft,
  GenerationRequest,
  GenerationState,
  GeneratorOutput,
} from '@ancora/schemas';
import type { ChallengeView } from '@ancora/shared-types';
import type { GenericRunnerCase } from '@/runner/protocol.mjs';
import type { StoredReport } from '@/server/programming-practice/reports';

export type RevisionContent = Omit<ChallengeView, 'publicCases'> & {
  publicCases: GenericRunnerCase[];
  referenceSource: string;
  checkCases: GenericRunnerCase[];
  runtimeVersion: string;
  validatorVersion: string;
  generationMetadata?: {
    generationId: string;
    dispatch: number;
    model: GeneratorOutput['model'];
    expectedOrigin: 'model_proposed';
  };
  generationDraft?: ChallengeDraft;
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
  report: jsonb('report').$type<StoredReport>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const practiceGenerations = pgTable('practice_generations', {
  id: text('id').primaryKey(),
  request: jsonb('request').$type<GenerationRequest>().notNull(),
  state: text('state').$type<GenerationState>().notNull(),
  dispatches: integer('dispatches').notNull(),
  revisionId: text('revision_id').references(() => practiceRevisions.id),
  error: text('error'),
  model: text('model'),
  events: jsonb('events')
    .$type<{ dispatch: number; outcome: string; at: string; error?: string }[]>()
    .notNull()
    .default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const practiceCandidates = pgTable(
  'practice_generation_candidates',
  {
    revisionId: text('revision_id')
      .primaryKey()
      .references(() => practiceRevisions.id),
    generationId: text('generation_id')
      .notNull()
      .references(() => practiceGenerations.id),
    dispatch: integer('dispatch').notNull(),
    jobId: text('job_id').notNull(),
    report: jsonb('report').$type<StoredReport>(),
    approved: boolean('approved').notNull().default(false),
  },
  (table) => [
    uniqueIndex('practice_generation_dispatch_unique').on(table.generationId, table.dispatch),
    uniqueIndex('practice_generation_job_unique').on(table.jobId),
  ]
);

export const practiceSessionSelection = pgTable('practice_session_selection', {
  id: integer('id').primaryKey(),
  revisionId: text('revision_id')
    .notNull()
    .references(() => practiceRevisions.id),
});
