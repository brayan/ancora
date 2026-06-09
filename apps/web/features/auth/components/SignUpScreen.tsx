import { SignUpForm } from "@/features/auth/components/SignUpForm";

export function SignUpScreen() {
  return (
    <main className="authPage">
      <section className="authPanel">
        <p className="eyebrow">Ancora account</p>
        <h1>Create account</h1>
        <p className="subtitle">
          A private account is created before any source material is stored.
        </p>
        <SignUpForm />
        <p className="authSwitch">
          Already have an account? <a href="/sign-in">Sign in</a>.
        </p>
      </section>
    </main>
  );
}
