import { redirect } from "next/navigation";
import { SignUpScreen } from "@/features/auth/components/SignUpScreen";
import { auth } from "@/server/auth";

export default async function SignUpPage() {
  const session = await auth();

  if (session?.user?.accountId) {
    redirect("/");
  }

  return <SignUpScreen />;
}
