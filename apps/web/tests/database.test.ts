import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

async function readMigrationSql() {
  const migrationDirectory = new URL("../drizzle/", import.meta.url);
  const migrationFiles = await readdir(migrationDirectory);
  const sqlFiles = migrationFiles.filter((file) => file.endsWith(".sql")).sort();
  const migrations = await Promise.all(
    sqlFiles.map((file) => readFile(new URL(file, migrationDirectory), "utf8")),
  );

  return migrations.join("\n");
}

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
  const migrationSql = await readMigrationSql();

  assert.match(migrationSql, /"active_account_id" text/);
  assert.match(migrationSql, /SET "active_account_id" = "membership"."account_id"/);
  assert.match(migrationSql, /"users_active_account_id_idx"/);
  assert.match(migrationSql, /"sources_account_id_id_unique"/);
  assert.match(
    migrationSql,
    /"sources_account_created_by_membership_fk" FOREIGN KEY \("account_id","created_by_user_id"\) REFERENCES "public"."account_memberships"\("account_id","user_id"\)/,
  );
  assert.match(migrationSql, /"source_chunks_account_source_fk"/);
  assert.match(migrationSql, /FOREIGN KEY \("account_id","source_id"\)/);
  assert.match(
    migrationSql,
    /"llm_trace_refs_account_source_fk" FOREIGN KEY \("account_id","source_id"\) REFERENCES "public"."sources"\("account_id","id"\)/,
  );
  assert.match(
    migrationSql,
    /"llm_trace_refs_account_source_chunk_fk" FOREIGN KEY \("account_id","source_chunk_id"\) REFERENCES "public"."source_chunks"\("account_id","id"\)/,
  );
});
