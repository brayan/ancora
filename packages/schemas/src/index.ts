export const healthResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["status", "service"],
  properties: {
    status: { const: "ok" },
    service: { const: "ai-runtime" },
  },
} as const;
