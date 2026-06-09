import { HomeShell } from "@/features/home/components/HomeShell";
import { auth } from "@/server/auth";
import { getAccountScopeFromSessionValue } from "@/server/accounts/current";
import { listPastedSources } from "@/server/sources/service";

export default async function Page() {
  const session = await auth();
  const scope = await getAccountScopeFromSessionValue(session);
  const sources = scope ? await listPastedSources(scope) : [];

  return (
    <HomeShell
      initialSources={sources}
      user={
        scope
          ? {
              accountId: scope.accountId,
              email: session?.user?.email,
            }
          : null
      }
    />
  );
}
