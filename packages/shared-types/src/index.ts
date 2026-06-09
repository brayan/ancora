export type AccountId = string & { readonly __brand: "AccountId" };
export type UserId = string & { readonly __brand: "UserId" };
export type SourceId = string & { readonly __brand: "SourceId" };
export type DeckId = string & { readonly __brand: "DeckId" };
export type CardId = string & { readonly __brand: "CardId" };
export type TraceReference = string & { readonly __brand: "TraceReference" };

export type AccountScopedIdentity = Readonly<{
  accountId: AccountId;
  userId: UserId;
}>;

export type HealthResponse = Readonly<{
  status: "ok";
  service: "web-runtime";
}>;

export const pastedSourceTextLimits = {
  maxCharacters: 20_000,
} as const;

export type SourceType = "pasted_text";

export type SourceStatus = "stored";

export type SourceSummary = Readonly<{
  id: SourceId;
  accountId: AccountId;
  createdByUserId: UserId | null;
  title: string;
  sourceType: SourceType;
  status: SourceStatus;
  textCharacterCount: number;
  createdAt: string;
  updatedAt: string;
}>;

export type SourceDetail = SourceSummary &
  Readonly<{
    text: string;
  }>;

export type CreatePastedSourceRequest = Readonly<{
  title?: string;
  text: string;
}>;

export type CreatePastedSourceResponse = Readonly<{
  source: SourceSummary;
}>;

export type ListSourcesResponse = Readonly<{
  sources: readonly SourceSummary[];
}>;

export type ReadSourceResponse = Readonly<{
  source: SourceDetail;
}>;

export type SourceErrorCode =
  | "duplicate_source"
  | "empty_text"
  | "forbidden"
  | "invalid_request"
  | "malformed_text"
  | "not_found"
  | "text_too_long"
  | "unauthorized";
