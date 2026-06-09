"use client";

import { signOut } from "next-auth/react";

type AuthStatusProps = Readonly<{
  user: {
    email: string | null | undefined;
    accountId: string;
  } | null;
}>;

export function AuthStatus({ user }: AuthStatusProps) {
  if (!user) {
    return (
      <nav className="authLinks" aria-label="Authentication">
        <a className="buttonLink secondary" href="/sign-in">
          Sign in
        </a>
        <a className="buttonLink primary" href="/sign-up">
          Create account
        </a>
      </nav>
    );
  }

  return (
    <div className="authStatus">
      <div>
        <span>{user.email}</span>
        <small>Account {user.accountId.slice(0, 8)}</small>
      </div>
      <button className="buttonLink secondary" type="button" onClick={() => void signOut()}>
        Sign out
      </button>
    </div>
  );
}
