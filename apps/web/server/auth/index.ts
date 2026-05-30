import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticateCredentialsWithDatabase } from "@/server/auth/credentials";
import { getAuthSecret } from "@/server/env";
import { db } from "@/server/db/client";
import {
  authAuthenticators,
  authProviderAccounts,
  authSessions,
  authVerificationTokens,
  users,
} from "@/server/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: authProviderAccounts,
    sessionsTable: authSessions,
    verificationTokensTable: authVerificationTokens,
    authenticatorsTable: authAuthenticators,
  }),
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.accountId = user.accountId;
      }

      return token;
    },
    session({ session, token }) {
      if (
        session.user &&
        typeof token.userId === "string" &&
        typeof token.accountId === "string"
      ) {
        session.user.id = token.userId;
        session.user.accountId = token.accountId;
      }

      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        return authenticateCredentialsWithDatabase({
          email: credentials.email,
          password: credentials.password,
        });
      },
    }),
  ],
  secret: getAuthSecret(),
  session: {
    strategy: "jwt",
  },
  trustHost: true,
});
