import { createHash } from "node:crypto";
import type {
  AccountId,
  SourceDetail,
  SourceId,
  SourceSummary,
  UserId,
} from "@ancora/shared-types";
import type { AccountScope } from "@/server/accounts/access";
import { parsePastedSourceInput } from "@/server/sources/validation";

export type PersistPastedSourceInput = Readonly<{
  accountId: string;
  createdByUserId: string;
  title: string;
  text: string;
  textCharacterCount: number;
  contentSha256: string;
}>;

export type SourceStore = Readonly<{
  createPastedSource(input: PersistPastedSourceInput): Promise<SourceSummary>;
  listSources(scope: AccountScope): Promise<readonly SourceSummary[]>;
  readSource(scope: AccountScope, sourceId: string): Promise<SourceDetail | null>;
}>;

export async function createPastedSource(
  scope: AccountScope,
  input: { title?: unknown; text?: unknown },
  store?: SourceStore,
) {
  const parsed = parsePastedSourceInput(input);
  const sourceStore = store ?? (await loadDatabaseSourceStore());

  return sourceStore.createPastedSource({
    accountId: scope.accountId,
    createdByUserId: scope.userId,
    title: parsed.title,
    text: parsed.text,
    textCharacterCount: parsed.textCharacterCount,
    contentSha256: sha256(parsed.text),
  });
}

export async function listPastedSources(scope: AccountScope, store?: SourceStore) {
  const sourceStore = store ?? (await loadDatabaseSourceStore());

  return sourceStore.listSources(scope);
}

export async function readPastedSource(
  scope: AccountScope,
  sourceId: string,
  store?: SourceStore,
) {
  const normalizedSourceId = sourceId.trim();

  if (!normalizedSourceId) {
    return null;
  }

  const sourceStore = store ?? (await loadDatabaseSourceStore());

  return sourceStore.readSource(scope, normalizedSourceId);
}

export function toSourceSummary(input: {
  id: string;
  accountId: string;
  createdByUserId: string | null;
  title: string;
  textCharacterCount: number;
  createdAt: Date;
  updatedAt: Date;
}): SourceSummary {
  return {
    id: input.id as SourceId,
    accountId: input.accountId as AccountId,
    createdByUserId: input.createdByUserId as UserId | null,
    title: input.title,
    sourceType: "pasted_text",
    status: "stored",
    textCharacterCount: input.textCharacterCount,
    createdAt: input.createdAt.toISOString(),
    updatedAt: input.updatedAt.toISOString(),
  };
}

function sha256(text: string) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

async function loadDatabaseSourceStore() {
  const { databaseSourceStore } = await import("@/server/sources/repository");

  return databaseSourceStore;
}
