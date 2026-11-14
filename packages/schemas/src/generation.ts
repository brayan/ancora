import { z } from 'zod';

export const pythonTypeSchema = z.enum([
  'int',
  'str',
  'list[int]',
  'list[str]',
  'dict[str,int]',
  'dict[str,str]',
]);
const pythonName = z.string().regex(/^(?!__)[A-Za-z_][A-Za-z0-9_]{0,39}$/);
export const functionContractSchema = z.strictObject({
  name: pythonName,
  parameter: z.strictObject({ name: pythonName, type: pythonTypeSchema }),
  returns: pythonTypeSchema,
});
export const generationRequestSchema = z.strictObject({
  language: z.literal('python'),
  concept: z.enum(['collections', 'comprehensions', 'dictionaries', 'strings', 'functions']),
  difficulty: z.enum(['beginner', 'intermediate']),
  goal: z.string().min(1).max(300),
  targetMinutes: z.number().int().min(5).max(30),
  preferences: z.string().max(300),
});
export const generatedCaseSchema = z.strictObject({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/),
  inputJson: z.string().min(1).max(6_000),
  expectedJson: z.string().min(1).max(6_000),
});
export const challengeDraftSchema = z.strictObject({
  schemaVersion: z.literal(1),
  title: z.string().min(1).max(200),
  concept: generationRequestSchema.shape.concept,
  difficulty: generationRequestSchema.shape.difficulty,
  objective: z.string().min(1).max(500),
  statement: z.string().min(1).max(4_000),
  functionContract: functionContractSchema,
  requirements: z.array(z.string().min(1).max(500)).min(1).max(12),
  constraints: z.array(z.string().min(1).max(500)).min(1).max(10),
  technique: z.enum(['none', 'list_comprehension', 'dict_comprehension']),
  publicCases: z.array(generatedCaseSchema).min(2).max(4),
  checkCases: z.array(generatedCaseSchema).min(3).max(8),
  referenceSource: z.string().min(1).max(12_000),
});
export const generatorInputSchema = z.strictObject({
  schemaVersion: z.literal(1),
  request: generationRequestSchema,
  previous: challengeDraftSchema.nullable(),
  feedback: z.array(z.string().max(100)).max(10),
  recentExercises: z.array(z.string().max(200)).max(5),
});
export const generatorOutputSchema = z.strictObject({
  schemaVersion: z.literal(1),
  draft: challengeDraftSchema,
  model: z.strictObject({
    provider: z.literal('openai'),
    name: z.string().min(1).max(100),
    promptVersion: z.literal('programming-practice-v1'),
    schemaVersion: z.literal(1),
  }),
});

export function exportGenerationSchemas() {
  return Object.fromEntries(
    Object.entries({
      request: generationRequestSchema,
      draft: challengeDraftSchema,
      input: generatorInputSchema,
      output: generatorOutputSchema,
    }).map(([name, schema]) => [name, z.toJSONSchema(schema)])
  );
}

export const generationStateSchema = z.enum([
  'generating',
  'validating',
  'correction_available',
  'ready',
  'rejected',
  'interrupted',
]);
export const startGenerationSchema = z.strictObject({
  apiVersion: z.literal(1),
  id: z.string().uuid(),
  request: generationRequestSchema,
});
export const correctionRequestSchema = z.strictObject({ apiVersion: z.literal(1) });
export const generationValidationSchema = z.strictObject({
  apiVersion: z.literal(1),
  revisionId: z.string().min(1).max(100),
  report: z.record(z.string(), z.unknown()),
});
export const generationViewSchema = z.strictObject({
  id: z.string().uuid(),
  state: generationStateSchema,
  dispatches: z.number().int().min(1).max(2),
  revisionId: z.string().nullable(),
  title: z.string().max(200).nullable(),
  error: z.string().max(100).nullable(),
  model: z.string().max(100).nullable(),
});
export const generationStatusSchema = z.strictObject({
  generation: generationViewSchema.nullable(),
  available: z.boolean(),
  model: z.string().max(100).nullable(),
});

export type PythonValue =
  | number
  | string
  | number[]
  | string[]
  | Record<string, number>
  | Record<string, string>;

export function matchesPythonType(
  value: unknown,
  type: z.infer<typeof pythonTypeSchema>
): value is PythonValue {
  const integer = (item: unknown) =>
    typeof item === 'number' && Number.isSafeInteger(item) && Math.abs(item) <= 1_000_000;
  const string = (item: unknown) => typeof item === 'string' && item.length <= 2_000;
  if (type === 'int') {
    return integer(value);
  }
  if (type === 'str') {
    return string(value);
  }
  if (type === 'list[int]' || type === 'list[str]') {
    return (
      Array.isArray(value) &&
      value.length <= 100 &&
      value.every(type === 'list[int]' ? integer : string)
    );
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  return (
    Object.keys(value).length <= 100 &&
    Object.entries(value).every(
      ([key, item]) =>
        key.length <= 100 && (type === 'dict[str,int]' ? integer(item) : string(item))
    )
  );
}

export function parseGeneratedCases(draft: z.infer<typeof challengeDraftSchema>) {
  const parse = (item: z.infer<typeof generatedCaseSchema>) => {
    const input: unknown = JSON.parse(item.inputJson);
    const expected: unknown = JSON.parse(item.expectedJson);
    if (
      !matchesPythonType(input, draft.functionContract.parameter.type) ||
      !matchesPythonType(expected, draft.functionContract.returns)
    ) {
      throw new Error('case_type_mismatch');
    }
    return { id: item.id, input, expected };
  };
  const publicCases = draft.publicCases.map(parse);
  const checkCases = draft.checkCases.map(parse);
  const ids = [...publicCases, ...checkCases].map((item) => item.id);
  if (new Set(ids).size !== ids.length || ids.length > 12) {
    throw new Error('case_identity_mismatch');
  }
  return { publicCases, checkCases: [...publicCases, ...checkCases] };
}

export type GenerationRequest = z.infer<typeof generationRequestSchema>;
export type ChallengeDraft = z.infer<typeof challengeDraftSchema>;
export type FunctionContract = z.infer<typeof functionContractSchema>;
export type PythonType = z.infer<typeof pythonTypeSchema>;
export type GeneratorInput = z.infer<typeof generatorInputSchema>;
export type GeneratorOutput = z.infer<typeof generatorOutputSchema>;
export type GenerationView = z.infer<typeof generationViewSchema>;
export type GenerationState = z.infer<typeof generationStateSchema>;
