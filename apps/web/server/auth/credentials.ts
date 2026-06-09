import { hashPassword, isPasswordAllowed, verifyPassword } from "@/server/auth/passwords";

export type CredentialsAuthInput = Readonly<{
  email: unknown;
  password: unknown;
}>;

export type CredentialsRegistrationInput = CredentialsAuthInput &
  Readonly<{
    name?: unknown;
  }>;

export type CredentialsUserRecord = Readonly<{
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  activeAccountId: string | null;
}>;

export type RegisteredCredentialsUser = Readonly<{
  id: string;
  email: string;
  name: string | null;
  activeAccountId: string;
}>;

export type CredentialsUserStore = Readonly<{
  findByEmail(email: string): Promise<CredentialsUserRecord | null>;
  createUserWithAccount(input: {
    email: string;
    name: string | null;
    passwordHash: string;
  }): Promise<RegisteredCredentialsUser>;
}>;

export type CredentialsRegistrationErrorCode =
  | "duplicate_email"
  | "invalid_email"
  | "invalid_password";

export class CredentialsRegistrationError extends Error {
  readonly code: CredentialsRegistrationErrorCode;

  constructor(code: CredentialsRegistrationErrorCode, message: string) {
    super(message);
    this.name = "CredentialsRegistrationError";
    this.code = code;
  }
}

export async function registerCredentialsUser(
  input: CredentialsRegistrationInput,
  store: CredentialsUserStore,
) {
  const email = normalizeEmail(input.email);
  const password = parsePassword(input.password);
  const name = parseName(input.name);

  if (!email) {
    throw new CredentialsRegistrationError("invalid_email", "Enter a valid email address.");
  }

  if (!password || !isPasswordAllowed(password)) {
    throw new CredentialsRegistrationError(
      "invalid_password",
      "Password must be at least 12 characters.",
    );
  }

  const existingUser = await store.findByEmail(email);

  if (existingUser) {
    throw new CredentialsRegistrationError(
      "duplicate_email",
      "An account already exists for that email.",
    );
  }

  return store.createUserWithAccount({
    email,
    name,
    passwordHash: await hashPassword(password),
  });
}

export async function authenticateCredentials(
  input: CredentialsAuthInput,
  store: CredentialsUserStore,
) {
  const email = normalizeEmail(input.email);
  const password = parsePassword(input.password);

  if (!email || !password) {
    return null;
  }

  const user = await store.findByEmail(email);

  if (!user?.passwordHash || !user.activeAccountId) {
    return null;
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);

  if (!passwordMatches) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    accountId: user.activeAccountId,
  };
}

export async function registerCredentialsUserWithDatabase(input: CredentialsRegistrationInput) {
  const { databaseCredentialsUserStore } = await import("@/server/auth/repository");

  return registerCredentialsUser(input, databaseCredentialsUserStore);
}

export async function authenticateCredentialsWithDatabase(input: CredentialsAuthInput) {
  const { databaseCredentialsUserStore } = await import("@/server/auth/repository");

  return authenticateCredentials(input, databaseCredentialsUserStore);
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

function parsePassword(value: unknown) {
  return typeof value === "string" ? value : null;
}

function parseName(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}
