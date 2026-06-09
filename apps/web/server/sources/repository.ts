import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { sourceChunks, sources } from "@/server/db/schema";
import { DuplicateSourceError } from "@/server/sources/errors";
import {
  toSourceSummary,
  type PersistPastedSourceInput,
  type SourceStore,
} from "@/server/sources/service";

const PASTED_TEXT_CHUNK_INDEX = 0;

export const databaseSourceStore: SourceStore = {
  async createPastedSource(input) {
    try {
      return await db.transaction(async (tx) => {
        const [source] = await tx
          .insert(sources)
          .values({
            accountId: input.accountId,
            createdByUserId: input.createdByUserId,
            title: input.title,
            sourceType: "pasted_text",
            contentSha256: input.contentSha256,
            status: "stored",
            metadata: sourceMetadata(input),
          })
          .returning({
            id: sources.id,
            accountId: sources.accountId,
            createdByUserId: sources.createdByUserId,
            title: sources.title,
            createdAt: sources.createdAt,
            updatedAt: sources.updatedAt,
          });

        const storedSource = requireStoredSource(source);

        await tx.insert(sourceChunks).values({
          accountId: input.accountId,
          sourceId: storedSource.id,
          chunkIndex: PASTED_TEXT_CHUNK_INDEX,
          content: input.text,
          contentSha256: input.contentSha256,
          metadata: {
            sourceType: "pasted_text",
            textCharacterCount: input.textCharacterCount,
          },
        });

        return toSourceSummary({
          ...storedSource,
          textCharacterCount: input.textCharacterCount,
        });
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DuplicateSourceError();
      }

      throw error;
    }
  },

  async listSources(scope) {
    const records = await db
      .select({
        id: sources.id,
        accountId: sources.accountId,
        createdByUserId: sources.createdByUserId,
        title: sources.title,
        metadata: sources.metadata,
        createdAt: sources.createdAt,
        updatedAt: sources.updatedAt,
      })
      .from(sources)
      .where(and(eq(sources.accountId, scope.accountId), eq(sources.sourceType, "pasted_text")))
      .orderBy(desc(sources.createdAt));

    return records.map((record) =>
      toSourceSummary({
        ...record,
        textCharacterCount: readTextCharacterCount(record.metadata),
      }),
    );
  },

  async readSource(scope, sourceId) {
    const [record] = await db
      .select({
        id: sources.id,
        accountId: sources.accountId,
        createdByUserId: sources.createdByUserId,
        title: sources.title,
        metadata: sources.metadata,
        createdAt: sources.createdAt,
        updatedAt: sources.updatedAt,
        text: sourceChunks.content,
      })
      .from(sources)
      .innerJoin(
        sourceChunks,
        and(
          eq(sourceChunks.accountId, sources.accountId),
          eq(sourceChunks.sourceId, sources.id),
          eq(sourceChunks.chunkIndex, PASTED_TEXT_CHUNK_INDEX),
        ),
      )
      .where(
        and(
          eq(sources.accountId, scope.accountId),
          eq(sources.id, sourceId),
          eq(sources.sourceType, "pasted_text"),
        ),
      )
      .limit(1);

    if (!record) {
      return null;
    }

    return {
      ...toSourceSummary({
        ...record,
        textCharacterCount: readTextCharacterCount(record.metadata),
      }),
      text: record.text,
    };
  },
};

function sourceMetadata(input: PersistPastedSourceInput) {
  return {
    sourceType: "pasted_text",
    textCharacterCount: input.textCharacterCount,
  };
}

function readTextCharacterCount(metadata: Record<string, unknown>) {
  return typeof metadata.textCharacterCount === "number" &&
    Number.isInteger(metadata.textCharacterCount) &&
    metadata.textCharacterCount >= 0
    ? metadata.textCharacterCount
    : 0;
}

function requireStoredSource<T>(source: T | undefined) {
  if (!source) {
    throw new Error("Failed to store source metadata.");
  }

  return source;
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
