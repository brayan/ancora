import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      accountId: string;
    };
  }

  interface User {
    accountId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    accountId?: string;
  }
}
