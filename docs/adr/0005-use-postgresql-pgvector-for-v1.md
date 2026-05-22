# 0005: Use PostgreSQL and pgvector for v1

## Status

Accepted

## Context

Ancora needs durable product data and vector search for source chunks. A separate vector database would add operational complexity before retrieval quality, card generation, and review workflows are proven.

## Decision

Use PostgreSQL as the v1 durable database and pgvector as the v1 vector store.

## Alternatives Considered

- A standalone vector database.
- SQLite plus a local vector index.
- Storing embeddings only in files or external services.

## Consequences

- Product records, account boundaries, source chunk metadata, and embeddings can share transactional storage.
- Local development and Docker Compose remain simpler.
- pgvector is sufficient for the first vertical slice and early evals.
- Retrieval scale limits may require revisiting this decision later.
