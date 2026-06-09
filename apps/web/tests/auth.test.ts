import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AccountAuthorizationError,
  assertAccountScopedRecord,
  getAccountScopeFromSession,
  requireAccountScope,
} from "../server/accounts/access";
import {
  authenticateCredentials,
  CredentialsRegistrationError,
  registerCredentialsUser,
  type CredentialsUserRecord,
  type CredentialsUserStore,
} from "../server/auth/credentials";

test("should register and authenticate a credentials user with an account-scoped session", async () => {
  const { store } = createCredentialsStore();

  const registeredUser = await registerCredentialsUser(
    {
      email: "Learner@Example.com",
      name: "Learner",
      password: "correct horse battery",
    },
    store,
  );
  const authenticatedUser = await authenticateCredentials(
    {
      email: "learner@example.com",
      password: "correct horse battery",
    },
    store,
  );
  const scope = getAccountScopeFromSession({
    user: {
      id: authenticatedUser?.id,
      accountId: authenticatedUser?.accountId,
    },
  });

  assert.equal(registeredUser.email, "learner@example.com");
  assert.equal(authenticatedUser?.id, registeredUser.id);
  assert.equal(scope?.accountId, registeredUser.activeAccountId);
});

test("should reject duplicate credentials registration by normalized email", async () => {
  const { store } = createCredentialsStore();

  await registerCredentialsUser(
    {
      email: "learner@example.com",
      password: "correct horse battery",
    },
    store,
  );

  await assert.rejects(
    () =>
      registerCredentialsUser(
        {
          email: " LEARNER@example.com ",
          password: "correct horse battery",
        },
        store,
      ),
    (error) =>
      error instanceof CredentialsRegistrationError && error.code === "duplicate_email",
  );
});

test("should fail authentication for invalid credentials", async () => {
  const { store } = createCredentialsStore();

  await registerCredentialsUser(
    {
      email: "learner@example.com",
      password: "correct horse battery",
    },
    store,
  );

  assert.equal(
    await authenticateCredentials(
      {
        email: "learner@example.com",
        password: "wrong horse battery",
      },
      store,
    ),
    null,
  );
  assert.equal(
    await authenticateCredentials(
      {
        email: "missing@example.com",
        password: "correct horse battery",
      },
      store,
    ),
    null,
  );
});

test("should fail closed when account scope is missing", () => {
  assert.equal(getAccountScopeFromSession(null), null);
  assert.equal(getAccountScopeFromSession({ user: { id: "user_1" } }), null);

  assert.throws(
    () => requireAccountScope(null),
    (error) => error instanceof AccountAuthorizationError && error.status === 401,
  );
});

test("should reject records outside the current account", () => {
  const scope = { accountId: "account_1", userId: "user_1" };

  assert.deepEqual(assertAccountScopedRecord(scope, { accountId: "account_1" }), {
    accountId: "account_1",
  });
  assert.throws(
    () => assertAccountScopedRecord(scope, { accountId: "account_2" }),
    (error) => error instanceof AccountAuthorizationError && error.status === 403,
  );
});

function createCredentialsStore() {
  const users = new Map<string, CredentialsUserRecord>();
  let userSequence = 0;
  let accountSequence = 0;

  const store: CredentialsUserStore = {
    async findByEmail(email) {
      return users.get(email) ?? null;
    },
    async createUserWithAccount(input) {
      if (users.has(input.email)) {
        throw new CredentialsRegistrationError(
          "duplicate_email",
          "An account already exists for that email.",
        );
      }

      userSequence += 1;
      accountSequence += 1;

      const record = {
        id: `user_${userSequence}`,
        email: input.email,
        name: input.name,
        passwordHash: input.passwordHash,
        activeAccountId: `account_${accountSequence}`,
      };

      users.set(input.email, record);

      return {
        id: record.id,
        email: record.email,
        name: record.name,
        activeAccountId: record.activeAccountId,
      };
    },
  };

  return { store };
}
