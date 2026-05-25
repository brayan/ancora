export type AccountScope = Readonly<{
  accountId: string;
  userId: string;
}>;

export type AccountScopedRecord = Readonly<{
  accountId: string;
}>;

export class AccountAuthorizationError extends Error {
  readonly status: 401 | 403;

  constructor(message: string, status: 401 | 403 = 401) {
    super(message);
    this.name = "AccountAuthorizationError";
    this.status = status;
  }
}

export function getAccountScopeFromSession(session: unknown): AccountScope | null {
  if (!session || typeof session !== "object" || !("user" in session)) {
    return null;
  }

  const user = session.user;

  if (!user || typeof user !== "object") {
    return null;
  }

  const accountId = "accountId" in user ? user.accountId : null;
  const userId = "id" in user ? user.id : null;

  if (typeof accountId !== "string" || accountId.length === 0) {
    return null;
  }

  if (typeof userId !== "string" || userId.length === 0) {
    return null;
  }

  return { accountId, userId };
}

export function requireAccountScope(scope: AccountScope | null | undefined) {
  if (!scope) {
    throw new AccountAuthorizationError("Authentication with an account is required.");
  }

  return scope;
}

export function assertAccountScopedRecord(
  scope: AccountScope | null | undefined,
  record: AccountScopedRecord | null | undefined,
) {
  const requiredScope = requireAccountScope(scope);

  if (!record || record.accountId !== requiredScope.accountId) {
    throw new AccountAuthorizationError("Requested resource is outside the current account.", 403);
  }

  return record;
}
