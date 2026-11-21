# ADR 0020: Publish Python feature contracts

Status: Accepted — the owner requested alignment with the current Engineering Playbook and Lumera.

## Decision

Apply the [Playbook's Python feature conventions](https://github.com/brayan/engineering-playbook/blob/b6de917c5280f7ee0ab6cf0a8ca2512ed9291477/docs/backend/python-service-conventions.md) and the boundary pattern demonstrated in [Lumera PR #406](https://github.com/brayan/sailtech/pull/406).

- Each of `challenges`, `hints` and `coaching` owns one FastAPI router and its
  HTTP schemas, dependencies, typed mappers and error translation. Challenges
  owns both its generation and status endpoints. Common request bounds, schema
  primitives and interruption handling live in `shared/api`.
- Bootstrap wires provider instances and mounts feature routers under the
  existing `/v1` prefix. It supplies the accepted error codes to shared
  request validation and middleware. The assembled app already generates
  OpenAPI in process and `packages/schemas` owns the versioned cross-language
  contracts. A separate Python schema catalog has no consumer.
- Use `application/ports` for the protocols each feature needs. Keep callable
  use cases, plain domain models and separate provider schemas. Use typed
  `map_<source>_to_<destination>` functions at transport and provider boundaries.
- Publish the challenge types, value validator, error and HTTP schema symbols
  that consumers actually import. Coaching consumes the published hint challenge
  schema. The feature interfaces declare individual symbols at their owning
  modules. Everything else stays private to its owner.
- Keep exact Tach module edges and a separate interface view grouped by feature.
  Check layer direction, shared independence, private infrastructure and file
  and feature cycles over Tach's static import map in pytest. Cover direct,
  aliased and type-only imports and rejection of a private sibling of a published
  symbol. Keep feature tests flat and app-wide tests at the test root.

## Scope and validation

This supersedes the central API package and `application/interfaces` paths in
ADRs 0017 and 0018. ADR 0019 continues to own `__call__` and operation names.
Keep endpoint paths, methods, operation IDs, response shapes, request limits
and wire contracts stable. Compare the assembled OpenAPI before and after,
exercise the locked Python and repository checks, and use Chrome with synthetic
providers for the practice flow. The existing dependency and migration locks
cover this refactor.
