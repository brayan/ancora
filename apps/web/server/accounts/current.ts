import "server-only";

import { auth } from "@/server/auth";
import {
  getAccountScopeFromSession,
  requireAccountScope,
  type AccountScope,
} from "@/server/accounts/access";
import { userBelongsToAccount } from "@/server/auth/repository";

export async function getCurrentAccountScope(): Promise<AccountScope | null> {
  const scope = getAccountScopeFromSession(await auth());

  if (!scope) {
    return null;
  }

  return (await userBelongsToAccount(scope.userId, scope.accountId)) ? scope : null;
}

export async function requireCurrentAccountScope() {
  return requireAccountScope(await getCurrentAccountScope());
}
