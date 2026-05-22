# 0004: Use OpenAI as the Default LLM Provider

## Status

Accepted

## Context

Ancora needs reliable chat, structured output, embeddings, tracing metadata, and eval repeatability for the first vertical slice. The project should avoid provider abstraction work before the core product loop exists.

## Decision

Use OpenAI as the default v1 LLM and embedding provider. Provider calls should be isolated behind clear service boundaries so later provider additions are possible without changing product concepts.

## Alternatives Considered

- Building a provider-agnostic abstraction before the first vertical slice.
- Starting with local models.
- Starting with multiple hosted providers.

## Consequences

- v1 can focus on product quality, RAG behavior, prompts, and evals instead of provider routing.
- User source text may be sent to OpenAI during product workflows, so the product and docs must make provider use clear.
- API keys must stay in environment variables and never be committed.
- Later providers require tests and an ADR if they change product behavior, privacy posture, or cost assumptions.
