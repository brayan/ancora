export const healthResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["status", "service"],
  properties: {
    status: { const: "ok" },
    service: { const: "web-runtime" },
  },
} as const;

export const pastedSourceTextLimits = {
  maxCharacters: 20_000,
} as const;

export const createPastedSourceRequestSchema = {
  type: "object",
  additionalProperties: false,
  required: ["text"],
  properties: {
    title: {
      type: "string",
      maxLength: 120,
    },
    text: {
      type: "string",
      minLength: 1,
      maxLength: pastedSourceTextLimits.maxCharacters,
    },
  },
} as const;

export const sourceSummarySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "accountId",
    "createdByUserId",
    "title",
    "sourceType",
    "status",
    "textCharacterCount",
    "createdAt",
    "updatedAt",
  ],
  properties: {
    id: { type: "string", minLength: 1 },
    accountId: { type: "string", minLength: 1 },
    createdByUserId: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    title: { type: "string", minLength: 1 },
    sourceType: { const: "pasted_text" },
    status: { const: "stored" },
    textCharacterCount: { type: "integer", minimum: 0 },
    createdAt: { type: "string", minLength: 1 },
    updatedAt: { type: "string", minLength: 1 },
  },
} as const;

export const sourceDetailSchema = {
  ...sourceSummarySchema,
  required: [...sourceSummarySchema.required, "text"],
  properties: {
    ...sourceSummarySchema.properties,
    text: { type: "string" },
  },
} as const;
