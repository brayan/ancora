import { z } from 'zod';
import { functionContractSchema, generationRequestSchema } from './generation';

export const API_VERSION = 1;
export const MAX_SOURCE_LENGTH = 12_000;
const identifier = z.string().regex(/^[a-zA-Z0-9@_.:-]{1,100}$/);
const source = z.string().max(MAX_SOURCE_LENGTH);
const integerList = z.array(z.number().int().min(-1_000_000).max(1_000_000)).max(1_000);
const primitive = z.union([z.number().int().min(-1_000_000).max(1_000_000), z.string().max(2_000)]);
export const runnerValueSchema = z.union([
  primitive,
  integerList,
  z.array(z.string().max(2_000)).max(100),
  z.record(z.string().max(100), z.number().int().min(-1_000_000).max(1_000_000)),
  z.record(z.string().max(100), z.string().max(2_000)),
]);
export const modeSchema = z.enum(['examples', 'check']);
export const caseSchema = z.strictObject({
  id: identifier,
  input: runnerValueSchema,
  expected: runnerValueSchema,
});
export const challengeSchema = z.strictObject({
  revisionId: identifier,
  title: z.string().min(1).max(200),
  objective: z.string().min(1).max(500),
  statement: z.string().min(1).max(4_000),
  signature: z.string().min(1).max(300),
  requirements: z.array(z.string().min(1).max(500)).min(1).max(24),
  publicCases: z.array(caseSchema).min(1).max(12),
  starterCode: source,
  functionContract: functionContractSchema.optional(),
  technique: z.enum(['none', 'list_comprehension', 'dict_comprehension']).optional(),
  concept: generationRequestSchema.shape.concept.optional(),
  difficulty: generationRequestSchema.shape.difficulty.optional(),
});
export const draftSchema = z.strictObject({
  revisionId: identifier,
  source,
  version: z.number().int().nonnegative(),
});
export const saveDraftSchema = draftSchema.extend({ apiVersion: z.literal(API_VERSION) });
export const submitAttemptSchema = z.strictObject({
  apiVersion: z.literal(API_VERSION),
  revisionId: identifier,
  submissionId: z.string().uuid(),
  source: source.min(1).regex(/\S/),
  mode: modeSchema,
});
export const completeAttemptSchema = z.strictObject({
  apiVersion: z.literal(API_VERSION),
  report: z.record(z.string(), z.unknown()),
});
export const referenceSchema = z.strictObject({
  apiVersion: z.literal(API_VERSION),
  revisionId: identifier,
});
const legacyRunRequestSchema = z.strictObject({
  type: z.literal('run'),
  protocolVersion: z.literal(1),
  jobId: identifier,
  revisionId: identifier,
  sourceDigest: z.string().regex(/^[a-f0-9]{64}$/),
  casesDigest: z.string().regex(/^[a-f0-9]{64}$/),
  runtimeVersion: z.string().min(1).max(50),
  source,
  cases: z
    .array(caseSchema.extend({ input: integerList, expected: integerList }))
    .min(1)
    .max(12),
  functionName: z.literal('positive_even'),
  technique: z.literal('list_comprehension'),
});
export const runRequestSchema = z.union([
  legacyRunRequestSchema,
  legacyRunRequestSchema.omit({ functionName: true }).extend({
    protocolVersion: z.literal(2),
    functionContract: functionContractSchema,
    technique: z.enum(['none', 'list_comprehension', 'dict_comprehension']),
    cases: z.array(caseSchema).min(1).max(12),
  }),
]);
export const attemptSchema = z.strictObject({
  id: z.string().uuid(),
  revisionId: identifier,
  source,
  mode: modeSchema,
  createdAt: z.string().datetime(),
  report: z.record(z.string(), z.unknown()).nullable(),
});
export const attemptSummarySchema = attemptSchema.omit({ source: true, report: true }).extend({
  completed: z.boolean(),
});
export const sessionSchema = z.strictObject({
  apiVersion: z.literal(API_VERSION),
  challenge: challengeSchema,
  draft: draftSchema,
  attempts: z.array(attemptSummarySchema).max(20),
  latestAttempt: attemptSchema.nullable(),
  challenges: z
    .array(z.strictObject({ revisionId: identifier, title: z.string().max(200) }))
    .max(20)
    .optional(),
});
export const envelopeSchema = z.strictObject({
  apiVersion: z.literal(API_VERSION),
  attemptId: z.string().uuid().nullable(),
  request: runRequestSchema,
  report: z.record(z.string(), z.unknown()).nullable(),
});
export const practiceContracts = {
  session: sessionSchema,
  draft: saveDraftSchema,
  submission: submitAttemptSchema,
  completion: completeAttemptSchema,
  envelope: envelopeSchema,
  reference: referenceSchema,
};

export function exportPracticeSchemas() {
  return Object.fromEntries(
    Object.entries(practiceContracts).map(([name, contract]) => [name, z.toJSONSchema(contract)])
  );
}

export type PracticeDraft = z.infer<typeof draftSchema>;
export type ChallengeView = z.infer<typeof challengeSchema>;
export type PracticeSession = z.infer<typeof sessionSchema>;
export type PracticeAttempt = z.infer<typeof attemptSchema>;
export type Submission = z.infer<typeof submitAttemptSchema>;
export type RunEnvelope = z.infer<typeof envelopeSchema>;
