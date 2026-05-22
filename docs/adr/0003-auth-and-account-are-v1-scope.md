# 0003: Auth and Account Are v1 Scope

## Status

Accepted

## Context

Ancora handles private learning material, generated cards, reviews, traces, and eval-related metadata. Even early versions need a clear ownership boundary so source material, decks, and study history do not become global or anonymous product data by accident.

## Decision

Authentication and account ownership are required in v1. Account is the privacy and ownership boundary. Users act within accounts, and source material, source chunks, decks, cards, reviews, prompt outputs, eval runs, and trace references must be account-scoped where applicable.

## Alternatives Considered

- Anonymous-only local prototype.
- Adding auth after the RAG and flashcard workflows are complete.
- Treating user identity as a later UI concern only.

## Consequences

- Data models and APIs must include account-aware access control from the beginning.
- Tests and fixtures must avoid cross-account leakage.
- Auth adds early implementation cost, but prevents retrofitting privacy boundaries around private source text later.
- Local development may use a simple auth path first, as long as account ownership semantics are preserved.
