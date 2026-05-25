import { SignInForm } from "@/features/auth/components/SignInForm";

export function SignInScreen() {
  return (
    <main className="authPage">
      <section className="authPanel">
        <p className="eyebrow">Ancora account</p>
        <h1>Sign in</h1>
        <p className="subtitle">
          Use the local email and password flow for development.
        </p>
        <SignInForm />
        <p className="authSwitch">
          Need an account? <a href="/sign-up">Create one</a>.
        </p>
      </section>
    </main>
  );
}
