import { z } from 'zod';
import { functionContractSchema } from './generation';
import { caseSchema, challengeSchema, referenceSchema } from './practice';

export const hintLevelSchema = z.number().int().min(1).max(3);
export const hintContentSchema = z.string().min(1).max(1_800).regex(/\S/);
export const hintChallengeSchema = challengeSchema
  .pick({ title: true, objective: true, statement: true, requirements: true })
  .extend({
    functionContract: functionContractSchema,
    technique: z.enum(['none', 'list_comprehension', 'dict_comprehension']),
    publicCases: z.array(caseSchema).min(1).max(12),
  });
export const hintDraftSchema = z.strictObject({
  level: hintLevelSchema,
  content: hintContentSchema,
});
export const hintInputSchema = z.strictObject({
  schemaVersion: z.literal(1),
  level: hintLevelSchema,
  challenge: hintChallengeSchema,
  previousHints: z.array(hintContentSchema).max(2),
});
export const hintModelSchema = z.strictObject({
  provider: z.literal('openai'),
  name: z.string().min(1).max(100),
  promptVersion: z.literal('programming-hints-v1'),
  schemaVersion: z.literal(1),
});
export const hintOutputSchema = z.strictObject({
  schemaVersion: z.literal(1),
  hint: hintDraftSchema,
  model: hintModelSchema,
});
export const hintErrorSchema = z.enum([
  'hint_invalid',
  'provider_interrupted',
  'hints_unavailable',
]);
export const hintViewSchema = z.strictObject({
  id: z.string().uuid(),
  revisionId: referenceSchema.shape.revisionId,
  level: hintLevelSchema,
  state: z.enum(['generating', 'ready', 'failed', 'interrupted']),
  dispatches: z.number().int().min(1).max(2),
  content: hintContentSchema.nullable(),
  model: hintModelSchema.nullable(),
  error: hintErrorSchema.nullable(),
});
export const hintsSchema = z.strictObject({
  apiVersion: z.literal(1),
  available: z.boolean(),
  model: z.string().min(1).max(100).nullable(),
  hints: z.array(hintViewSchema).max(3),
});
export const requestHintSchema = referenceSchema.extend({
  id: z.string().uuid(),
  level: hintLevelSchema,
});
export const retryHintSchema = z.strictObject({ apiVersion: z.literal(1) });

export function exportHintSchemas() {
  return Object.fromEntries(
    Object.entries({
      input: hintInputSchema,
      draft: hintDraftSchema,
      output: hintOutputSchema,
      view: hintViewSchema,
      hints: hintsSchema,
      request: requestHintSchema,
      retry: retryHintSchema,
    }).map(([name, contract]) => [name, z.toJSONSchema(contract)])
  );
}

export type HintInput = z.infer<typeof hintInputSchema>;
export type HintOutput = z.infer<typeof hintOutputSchema>;
export type HintView = z.infer<typeof hintViewSchema>;
export type Hints = z.infer<typeof hintsSchema>;
export type HintError = z.infer<typeof hintErrorSchema>;
