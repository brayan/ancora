import assert from "node:assert/strict";
import { test } from "node:test";
import { AccountAuthorizationError } from "../server/accounts/access";
import { SourceInputError } from "../server/sources/errors";
import {
  createSourceDetailRouteHandlers,
  createSourcesRouteHandlers,
} from "../server/sources/http";
import {
  createPastedSource,
  listPastedSources,
  readPastedSource,
  toSourceSummary,
  type PersistPastedSourceInput,
  type SourceStore,
} from "../server/sources/service";
import { MAX_PASTED_SOURCE_TEXT_CHARACTERS } from "../server/sources/validation";

test("should reject invalid pasted source text before storage", async () => {
  const scope = { accountId: "account_1", userId: "user_1" };
  const store = createInMemorySourceStore();

  await assert.rejects(
    () => createPastedSource(scope, { text: "   " }, store),
    (error) => error instanceof SourceInputError && error.code === "empty_text",
  );
  await assert.rejects(
    () =>
      createPastedSource(
        scope,
        { text: "a".repeat(MAX_PASTED_SOURCE_TEXT_CHARACTERS + 1) },
        store,
      ),
    (error) => error instanceof SourceInputError && error.code === "text_too_long",
  );
  await assert.rejects(
    () => createPastedSource(scope, { text: "synthetic\u0000source" }, store),
    (error) => error instanceof SourceInputError && error.code === "malformed_text",
  );

  assert.equal(store.writes.length, 0);
});

test("should create and list pasted sources for the current account", async () => {
  const scope = { accountId: "account_1", userId: "user_1" };
  const store = createInMemorySourceStore();

  const source = await createPastedSource(
    scope,
    {
      title: "Synthetic study notes",
      text: "Synthetic source content for account-owned study material.",
    },
    store,
  );
  const listedSources = await listPastedSources(scope, store);

  assert.equal(source.accountId, scope.accountId);
  assert.equal(source.createdByUserId, scope.userId);
  assert.equal(source.sourceType, "pasted_text");
  assert.equal(source.status, "stored");
  assert.equal(source.textCharacterCount, 58);
  assert.equal(store.writes[0]?.contentSha256.length, 64);
  assert.notEqual(store.writes[0]?.contentSha256, store.writes[0]?.text);
  assert.equal(listedSources.length, 1);
  assert.equal(listedSources[0]?.id, source.id);
  assert.equal("text" in listedSources[0]!, false);
});

test("should preserve pasted source text exactly after validation", async () => {
  const scope = { accountId: "account_1", userId: "user_1" };
  const store = createInMemorySourceStore();
  const text = "\n  Synthetic source content with intentional whitespace.  \n";

  await createPastedSource(
    scope,
    {
      title: "Synthetic whitespace notes",
      text,
    },
    store,
  );

  assert.equal(store.writes[0]?.text, text);
  assert.equal(store.writes[0]?.textCharacterCount, text.length);
});

test("should fail closed when source routes are unauthenticated", async () => {
  let createWasCalled = false;
  let listWasCalled = false;
  const routes = createSourcesRouteHandlers({
    async requireAccountScope() {
      throw new AccountAuthorizationError("Authentication with an account is required.");
    },
    async createPastedSource() {
      createWasCalled = true;
      throw new Error("create should not be called");
    },
    async listPastedSources() {
      listWasCalled = true;
      throw new Error("list should not be called");
    },
  });

  const getResponse = await routes.GET();
  const postResponse = await routes.POST(
    new Request("http://ancora.test/api/sources", {
      method: "POST",
      body: JSON.stringify({ text: "Synthetic route text." }),
    }),
  );
  const malformedPostResponse = await routes.POST(
    new Request("http://ancora.test/api/sources", {
      method: "POST",
      body: "{",
    }),
  );

  assert.equal(getResponse.status, 401);
  assert.deepEqual(await getResponse.json(), { error: "unauthorized" });
  assert.equal(postResponse.status, 401);
  assert.deepEqual(await postResponse.json(), { error: "unauthorized" });
  assert.equal(malformedPostResponse.status, 401);
  assert.deepEqual(await malformedPostResponse.json(), { error: "unauthorized" });
  assert.equal(createWasCalled, false);
  assert.equal(listWasCalled, false);
});

test("should pass current account scope through source routes", async () => {
  const scope = { accountId: "account_1", userId: "user_1" };
  let listedAccountId: string | null = null;
  let readAccountId: string | null = null;
  let readSourceId: string | null = null;

  const routes = createSourcesRouteHandlers({
    async requireAccountScope() {
      return scope;
    },
    async createPastedSource() {
      throw new Error("create should not be called");
    },
    async listPastedSources(routeScope) {
      listedAccountId = routeScope.accountId;
      return [];
    },
  });
  const detailRoutes = createSourceDetailRouteHandlers({
    async requireAccountScope() {
      return scope;
    },
    async readPastedSource(routeScope, sourceId) {
      readAccountId = routeScope.accountId;
      readSourceId = sourceId;
      return null;
    },
  });

  const listResponse = await routes.GET();
  const readResponse = await detailRoutes.GET(new Request("http://ancora.test/api/sources/source_2"), {
    params: Promise.resolve({ sourceId: "source_2" }),
  });

  assert.equal(listResponse.status, 200);
  assert.deepEqual(await listResponse.json(), { sources: [] });
  assert.equal(readResponse.status, 404);
  assert.deepEqual(await readResponse.json(), { error: "not_found" });
  assert.equal(listedAccountId, "account_1");
  assert.equal(readAccountId, "account_1");
  assert.equal(readSourceId, "source_2");
});

test("should not read or list sources from another account in the source service", async () => {
  const ownerScope = { accountId: "account_1", userId: "user_1" };
  const otherScope = { accountId: "account_2", userId: "user_2" };
  const store = createInMemorySourceStore();

  const source = await createPastedSource(
    ownerScope,
    {
      title: "Synthetic account boundary notes",
      text: "Synthetic account boundary content.",
    },
    store,
  );

  assert.equal(await readPastedSource(otherScope, source.id, store), null);
  assert.deepEqual(await listPastedSources(otherScope, store), []);
});

function createInMemorySourceStore() {
  const records: Array<{
    summary: Awaited<ReturnType<typeof createPastedSource>>;
    text: string;
  }> = [];
  const writes: PersistPastedSourceInput[] = [];
  let sourceSequence = 0;

  const store: SourceStore & { writes: PersistPastedSourceInput[] } = {
    writes,

    async createPastedSource(input) {
      sourceSequence += 1;
      writes.push(input);

      const summary = toSourceSummary({
        id: `source_${sourceSequence}`,
        accountId: input.accountId,
        createdByUserId: input.createdByUserId,
        title: input.title,
        textCharacterCount: input.textCharacterCount,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      });

      records.unshift({
        summary,
        text: input.text,
      });

      return summary;
    },

    async listSources(scope) {
      return records
        .filter((record) => record.summary.accountId === scope.accountId)
        .map((record) => record.summary);
    },

    async readSource(scope, sourceId) {
      const record = records.find(
        (candidate) =>
          candidate.summary.accountId === scope.accountId && candidate.summary.id === sourceId,
      );

      return record ? { ...record.summary, text: record.text } : null;
    },
  };

  return store;
}
