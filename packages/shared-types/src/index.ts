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
