import { z } from 'zod';
import { hintChallengeSchema } from './hints';
import { MAX_SOURCE_LENGTH, referenceSchema } from './practice';

const text = z.string().min(1).max(900).regex(/\S/);
export const coachingDraftSchema = z.strictObject({
  summary: text,
  observations: z.array(text).min(1).max(4),
  nextStep: text,
});
export const coachingEvidenceSchema = z.strictObject({
  execution: z.enum([
    'result',
    'execution_error',
    'timeout',
    'stopped',
    'output_limit',
    'bootstrap_error',
    'invalid_message',
  ]),
  passed: z.number().int().min(0).max(12),
  total: z.number().int().min(0).max(12),
  technique: z.enum(['passed', 'failed', 'inconclusive', 'not_required']),
});
export const coachingInputSchema = z.strictObject({
  schemaVersion: z.literal(1),
  challenge: hintChallengeSchema,
  source: z.string().min(1).max(MAX_SOURCE_LENGTH).regex(/\S/),
  evidence: coachingEvidenceSchema,
});
export const coachingModelSchema = z.strictObject({
  provider: z.literal('openai'),
  name: z.string().min(1).max(100),
  promptVersion: z.literal('programming-coaching-v1'),
  schemaVersion: z.literal(1),
});
export const coachingOutputSchema = z.strictObject({
  schemaVersion: z.literal(1),
  feedback: coachingDraftSchema,
  model: coachingModelSchema,
});
export const coachingErrorSchema = z.enum([
  'coaching_invalid',
  'provider_interrupted',
  'coaching_unavailable',
]);
export const coachingViewSchema = z.strictObject({
  id: z.string().uuid(),
  attemptId: z.string().uuid(),
  revisionId: referenceSchema.shape.revisionId,
  sourceDigest: z.string().regex(/^[a-f0-9]{64}$/),
  consentVersion: z.literal('code-sharing-v1'),
  sharedAt: z.string().datetime(),
  state: z.enum(['generating', 'ready', 'failed', 'interrupted']),
  dispatches: z.number().int().min(1).max(2),
  feedback: coachingDraftSchema.nullable(),
  model: coachingModelSchema.nullable(),
  error: coachingErrorSchema.nullable(),
});
export const coachingStatusSchema = z.strictObject({
  apiVersion: z.literal(1),
  available: z.boolean(),
  model: z.string().min(1).max(100).nullable(),
  coaching: coachingViewSchema.nullable(),
});
export const requestCoachingSchema = z.strictObject({
  apiVersion: z.literal(1),
  id: z.string().uuid(),
  attemptId: z.string().uuid(),
  shareCode: z.literal(true),
});
export const retryCoachingSchema = requestCoachingSchema.pick({
  apiVersion: true,
  shareCode: true,
});

export function exportCoachingSchemas() {
  return Object.fromEntries(
    Object.entries({
      input: coachingInputSchema,
      draft: coachingDraftSchema,
      output: coachingOutputSchema,
      view: coachingViewSchema,
      status: coachingStatusSchema,
      request: requestCoachingSchema,
      retry: retryCoachingSchema,
    }).map(([name, contract]) => [name, z.toJSONSchema(contract)])
  );
}

export type CoachingInput = z.infer<typeof coachingInputSchema>;
export type CoachingOutput = z.infer<typeof coachingOutputSchema>;
export type CoachingView = z.infer<typeof coachingViewSchema>;
export type CoachingStatus = z.infer<typeof coachingStatusSchema>;
export type CoachingError = z.infer<typeof coachingErrorSchema>;
