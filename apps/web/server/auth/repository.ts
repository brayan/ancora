import "server-only";

import { and, eq } from "drizzle-orm";
import {
  accountMemberships,
  accounts,
  authProviderAccounts,
  users,
} from "@/server/db/schema";
import { db } from "@/server/db/client";
import {
  CredentialsRegistrationError,
  type CredentialsUserStore,
} from "@/server/auth/credentials";

export const databaseCredentialsUserStore: CredentialsUserStore = {
  async findByEmail(email) {
    const [record] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        passwordHash: users.passwordHash,
        activeAccountId: accountMemberships.accountId,
      })
      .from(users)
      .leftJoin(accountMemberships, eq(accountMemberships.userId, users.id))
      .where(eq(users.email, email))
      .limit(1);

    return record ?? null;
  },

  async createUserWithAccount(input) {
    try {
      return await db.transaction(async (tx) => {
        const accountName = input.name ? `${input.name}'s account` : input.email;
        const [account] = await tx
          .insert(accounts)
          .values({ name: accountName })
          .returning({ id: accounts.id });
        const createdAccount = requireInsertedRecord(account, "account");
        const [user] = await tx
          .insert(users)
          .values({
            email: input.email,
            name: input.name,
            passwordHash: input.passwordHash,
          })
          .returning({
            id: users.id,
            email: users.email,
            name: users.name,
          });
        const createdUser = requireInsertedRecord(user, "user");

        await tx.insert(accountMemberships).values({
          accountId: createdAccount.id,
          userId: createdUser.id,
          role: "owner",
        });

        await tx.insert(authProviderAccounts).values({
          userId: createdUser.id,
          type: "credentials",
          provider: "credentials",
          providerAccountId: createdUser.email,
        });

        return {
          id: createdUser.id,
          email: createdUser.email,
          name: createdUser.name,
          activeAccountId: createdAccount.id,
        };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new CredentialsRegistrationError(
          "duplicate_email",
          "An account already exists for that email.",
        );
      }

      throw error;
    }
  },
};

export async function userBelongsToAccount(userId: string, accountId: string) {
  const [membership] = await db
    .select({ accountId: accountMemberships.accountId })
    .from(accountMemberships)
    .where(
      and(
        eq(accountMemberships.userId, userId),
        eq(accountMemberships.accountId, accountId),
      ),
    )
    .limit(1);

  return Boolean(membership);
}

function requireInsertedRecord<T>(record: T | undefined, label: string) {
  if (!record) {
    throw new Error(`Failed to create ${label}.`);
  }

  return record;
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
