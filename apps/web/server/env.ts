export const serverEnvironment = {
  appEnv: process.env.APP_ENV ?? "local",
  hasAuthSecret: Boolean(process.env.AUTH_SECRET),
  hasOpenAiApiKey: Boolean(process.env.OPENAI_API_KEY),
  hasLangfuseConfig: Boolean(
    process.env.LANGFUSE_PUBLIC_KEY &&
      process.env.LANGFUSE_SECRET_KEY &&
      process.env.LANGFUSE_BASE_URL,
  ),
} as const;
