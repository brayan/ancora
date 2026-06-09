"use client";

import { FormEvent, useState, useTransition } from "react";
import { signIn } from "next-auth/react";

const errorMessages: Record<string, string> = {
  duplicate_email: "An account already exists for that email.",
  invalid_email: "Enter a valid email address.",
  invalid_password: "Password must be at least 12 characters.",
};

export function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          name: formData.get("name"),
          password: formData.get("password"),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(errorMessages[payload?.error ?? ""] ?? "Unable to create account.");
        return;
      }

      const result = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
      });

      if (result?.error) {
        setError("Account created, but sign-in failed. Sign in manually.");
        return;
      }

      window.location.assign(result?.url ?? "/");
    });
  }

  return (
    <form className="authForm" onSubmit={onSubmit}>
      <label>
        Name
        <input autoComplete="name" name="name" type="text" />
      </label>
      <label>
        Email
        <input autoComplete="email" name="email" required type="email" />
      </label>
      <label>
        Password
        <input
          autoComplete="new-password"
          minLength={12}
          name="password"
          required
          type="password"
        />
      </label>
      {error ? <p className="formError">{error}</p> : null}
      <button className="buttonLink primary" disabled={isPending} type="submit">
        {isPending ? "Creating account" : "Create account"}
      </button>
    </form>
  );
}
