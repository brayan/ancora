import { sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from "drizzle-orm/pg-core";
import { createDatabaseId } from "./ids";

function timestamps() {
  return {
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  };
}

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey().$defaultFn(createDatabaseId),
  name: text("name").notNull(),
  ...timestamps(),
});

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey().$defaultFn(createDatabaseId),
    name: text("name"),
    email: text("email").notNull(),
    activeAccountId: text("active_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    image: text("image"),
    passwordHash: text("password_hash"),
    ...timestamps(),
  },
  (table) => [
    index("users_active_account_id_idx").on(table.activeAccountId),
    uniqueIndex("users_email_unique").on(table.email),
  ],
);

export const accountMemberships = pgTable(
  "account_memberships",
  {
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.accountId, table.userId] }),
    index("account_memberships_user_id_idx").on(table.userId),
  ],
);

export const authProviderAccounts = pgTable(
  "auth_provider_accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
    index("auth_provider_accounts_user_id_idx").on(table.userId),
  ],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("auth_sessions_user_id_idx").on(table.userId),
  ],
);

export const authVerificationTokens = pgTable(
  "auth_verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.identifier, table.token] }),
  ],
);

export const authAuthenticators = pgTable(
  "auth_authenticators",
  {
    credentialID: text("credential_id").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("provider_account_id").notNull(),
    credentialPublicKey: text("credential_public_key").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credential_device_type").notNull(),
    credentialBackedUp: boolean("credential_backed_up").notNull(),
    transports: text("transports"),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.credentialID] }),
  ],
);

export const sources = pgTable(
  "sources",
  {
    id: text("id").primaryKey().$defaultFn(createDatabaseId),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    sourceType: text("source_type").notNull().default("pasted_text"),
    contentSha256: text("content_sha256").notNull(),
    status: text("status").notNull().default("draft"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    ...timestamps(),
  },
  (table) => [
    index("sources_account_id_idx").on(table.accountId),
    uniqueIndex("sources_account_id_id_unique").on(table.accountId, table.id),
    uniqueIndex("sources_account_content_sha256_unique").on(table.accountId, table.contentSha256),
  ],
);

export const sourceChunks = pgTable(
  "source_chunks",
  {
    id: text("id").primaryKey().$defaultFn(createDatabaseId),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    sourceId: text("source_id").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    contentSha256: text("content_sha256").notNull(),
    tokenCount: integer("token_count"),
    embedding: vector("embedding", { dimensions: 1536 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      name: "source_chunks_account_source_fk",
      columns: [table.accountId, table.sourceId],
      foreignColumns: [sources.accountId, sources.id],
    }).onDelete("cascade"),
    index("source_chunks_account_id_idx").on(table.accountId),
    index("source_chunks_source_id_idx").on(table.sourceId),
    uniqueIndex("source_chunks_account_id_id_unique").on(table.accountId, table.id),
    uniqueIndex("source_chunks_account_source_index_unique").on(
      table.accountId,
      table.sourceId,
      table.chunkIndex,
    ),
  ],
);

export const llmTraceRefs = pgTable(
  "llm_trace_refs",
  {
    id: text("id").primaryKey().$defaultFn(createDatabaseId),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    sourceId: text("source_id").references(() => sources.id, { onDelete: "set null" }),
    sourceChunkId: text("source_chunk_id").references(() => sourceChunks.id, {
      onDelete: "set null",
    }),
    workflow: text("workflow").notNull(),
    provider: text("provider").notNull(),
    model: text("model"),
    promptVersion: text("prompt_version"),
    traceRef: text("trace_ref").notNull(),
    status: text("status").notNull().default("created"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("llm_trace_refs_account_id_idx").on(table.accountId),
    uniqueIndex("llm_trace_refs_account_trace_ref_unique").on(table.accountId, table.traceRef),
  ],
);

export type Account = typeof accounts.$inferSelect;
export type User = typeof users.$inferSelect;
export type AccountMembership = typeof accountMemberships.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type SourceChunk = typeof sourceChunks.$inferSelect;
export type LlmTraceRef = typeof llmTraceRefs.$inferSelect;
