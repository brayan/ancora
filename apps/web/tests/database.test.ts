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

test("should enforce deterministic account ownership in migrations", async () => {
  const migrations = await Promise.all([
    readFile(new URL("../drizzle/0000_account-auth-foundation.sql", import.meta.url), "utf8"),
    readFile(
      new URL("../drizzle/0001_enforce-account-consistency.sql", import.meta.url),
      "utf8",
    ).catch(() => ""),
  ]);
  const migrationSql = migrations.join("\n");

  assert.match(migrationSql, /"active_account_id" text/);
  assert.match(migrationSql, /SET "active_account_id" = "membership"."account_id"/);
  assert.match(migrationSql, /"users_active_account_id_idx"/);
  assert.match(migrationSql, /"sources_account_id_id_unique"/);
  assert.match(migrationSql, /"source_chunks_account_source_fk"/);
  assert.match(migrationSql, /FOREIGN KEY \("account_id","source_id"\)/);
});
