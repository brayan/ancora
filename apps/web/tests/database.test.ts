import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("should include auth account and source foundations in the initial migration", async () => {
  const migration = await readFile(
    new URL("../drizzle/0000_account-auth-foundation.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /CREATE EXTENSION IF NOT EXISTS vector/);
  assert.match(migration, /CREATE TABLE "accounts"/);
  assert.match(migration, /CREATE TABLE "users"/);
  assert.match(migration, /CREATE TABLE "auth_sessions"/);
  assert.match(migration, /CREATE TABLE "sources"/);
  assert.match(migration, /CREATE TABLE "source_chunks"/);
  assert.match(migration, /"embedding" vector\(1536\)/);
  assert.match(migration, /CREATE TABLE "llm_trace_refs"/);
});
