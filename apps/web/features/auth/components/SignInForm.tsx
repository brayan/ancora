"use client";

import { FormEvent, useState, useTransition } from "react";
import { signIn } from "next-auth/react";

export function SignInForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password.");
        return;
      }

      window.location.assign(result?.url ?? "/");
    });
  }

  return (
    <form className="authForm" onSubmit={onSubmit}>
      <label>
        Email
        <input autoComplete="email" name="email" required type="email" />
      </label>
      <label>
        Password
        <input autoComplete="current-password" name="password" required type="password" />
      </label>
      {error ? <p className="formError">{error}</p> : null}
      <button className="buttonLink primary" disabled={isPending} type="submit">
        {isPending ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}
