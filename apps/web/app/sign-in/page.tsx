import { redirect } from "next/navigation";
import { SignInScreen } from "@/features/auth/components/SignInScreen";
import { auth } from "@/server/auth";

export default async function SignInPage() {
  const session = await auth();

  if (session?.user?.accountId) {
    redirect("/");
  }

  return <SignInScreen />;
}
