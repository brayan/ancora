import "server-only";

import { auth } from "@/server/auth";
import {
  getAccountScopeFromSession,
  requireAccountScope,
  type AccountScope,
} from "@/server/accounts/access";
import { userBelongsToAccount } from "@/server/auth/repository";

export async function getCurrentAccountScope(): Promise<AccountScope | null> {
  return getAccountScopeFromSessionValue(await auth());
}

export async function getAccountScopeFromSessionValue(
  session: unknown,
): Promise<AccountScope | null> {
  const scope = getAccountScopeFromSession(session);

  if (!scope) {
    return null;
  }

  return (await userBelongsToAccount(scope.userId, scope.accountId)) ? scope : null;
}

export async function requireCurrentAccountScope() {
  return requireAccountScope(await getCurrentAccountScope());
}
