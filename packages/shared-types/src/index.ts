export type AccountId = string & { readonly __brand: "AccountId" };
export type SourceId = string & { readonly __brand: "SourceId" };
export type DeckId = string & { readonly __brand: "DeckId" };
export type CardId = string & { readonly __brand: "CardId" };
export type TraceReference = string & { readonly __brand: "TraceReference" };

export type HealthResponse = Readonly<{
  status: "ok";
  service: "web-runtime";
}>;
