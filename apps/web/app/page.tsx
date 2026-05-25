import { HomeShell } from "@/features/home/components/HomeShell";
import { auth } from "@/server/auth";

export default async function Page() {
  const session = await auth();

  return (
    <HomeShell
      user={
        session?.user?.accountId
          ? {
              accountId: session.user.accountId,
              email: session.user.email,
            }
          : null
      }
    />
  );
}
