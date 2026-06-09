export const serverEnvironment = {
  appEnv: process.env.APP_ENV ?? "local",
  hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
  hasAuthSecret: Boolean(process.env.AUTH_SECRET),
  hasOpenAiApiKey: Boolean(process.env.OPENAI_API_KEY),
  hasLangfuseConfig: Boolean(
    process.env.LANGFUSE_PUBLIC_KEY &&
      process.env.LANGFUSE_SECRET_KEY &&
      process.env.LANGFUSE_BASE_URL,
  ),
} as const;

export function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production.");
  }

  return "postgresql://ancora:ancora@localhost:5432/ancora";
}

export function getAuthSecret() {
  if (process.env.AUTH_SECRET) {
    return process.env.AUTH_SECRET;
  }

  if (process.env.NODE_ENV === "production") {
    return undefined;
  }

  return "ancora-local-dev-auth-secret-change-before-production";
}
