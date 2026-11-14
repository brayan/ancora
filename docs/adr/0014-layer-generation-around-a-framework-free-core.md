# ADR 0014: Layer generation around a framework-free core

Status: Accepted

Date: 2026-11-14

## Context

ADR 0013 introduced bounded challenge generation with a flat Python package. Its provider interface accepted Pydantic HTTP models, while the HTTP factory constructed infrastructure and applied challenge rules. The owner requested application services and interfaces, a root `api/` package inside the Python service, capability-specific routers, and no Pydantic in business logic.

## Decision

Within `apps/practice-service/src/practice_service`, use these implemented boundaries:

```text
api/
  app.py                    # FastAPI composition and router registration
  dependencies.py           # FastAPI Depends accessors
  errors.py                 # Bounded HTTP error translation
  middleware.py             # Pre-parse token, Origin and byte checks
  routers/{generation,status}.py
  schemas/{generation,status}.py
  mappers/generation.py
application/
  models.py                 # Plain command, result and provenance dataclasses
  errors.py
  services/challenge_generation_service.py
  interfaces/challenge_generation_provider.py
domain/challenges/
  models.py                 # Plain challenge, contract and example dataclasses
  values.py                 # Finite supported values and JSON decoding
  rules.py                  # Request, case and reference-AST consistency
  errors.py
infrastructure/llm/
  openai_challenge_provider.py
  schemas.py                # Strict provider request/output schemas
  mappers.py
  unavailable.py
bootstrap.py                # Concrete adapters and resource lifetime
settings.py
main.py
```

`ChallengeGenerationService` owns meaningful orchestration: availability, one provider dispatch and deterministic acceptance of the resulting challenge. `ChallengeGenerationProvider` is the application-owned dependency interface, fulfilled by `OpenAIChallengeProvider` or an offline fake. It exchanges plain `GenerationCommand` and `GenerationResult` dataclasses. Its name distinguishes a provider dependency from the application service that uses it.

The domain and application import only the standard library and inward core modules. Pydantic, FastAPI, HTTP clients and provider SDKs stay outside them. Challenge cases use native finite Python values in the core; schema versions, camelCase aliases and JSON-string case encoding belong to the boundaries. The dataclasses are frozen, but nested case lists/dictionaries are ordinary values, not deeply immutable objects. Durable immutable revisions remain Next.js-owned.

The API and LLM adapters own separate Pydantic schemas and explicit mappings. Both are checked against the existing canonical generation-v1 wire artifact to prevent drift. Serialization may normalize JSON whitespace/escapes inside case strings; values and dictionary order are preserved. Existing routes, schema fields, safe errors, limits and single-dispatch behavior remain unchanged. Payload byte limits are checked at the boundaries, while challenge consistency belongs to the domain.

FastAPI `APIRouter` modules follow the official [bigger applications guidance](https://fastapi.tiangolo.com/tutorial/bigger-applications/). HTTP handlers map, call the service and project a response. Status reads the injected provider interface directly. Authentication of the trusted server and request byte checks remain pre-parse ASGI middleware. `bootstrap.py` creates concrete adapters and closes resources it owns; injected adapters remain caller-owned.

Do not add forwarding-only use-case classes, generic repositories, domain services or interfaces without behavior that needs them. A repository would describe persistence; generation is an external provider operation. Python still has no product database writer, migration owner or solution executor. ADRs 0011–0013 continue to own those boundaries, the correction allowance and privacy rules.

## Consequences and validation

Pure domain rules and application orchestration can be tested without frameworks or network calls. Import-direction tests reject outward dependencies, and a subprocess imports the entire core with site packages disabled. Boundary parity, mapping, service, provider transport and HTTP regressions run offline. Real Chrome generation tests verify Next.js-to-FastAPI integration with a synthetic provider. No dependency, migration, prompt or paid-evaluation change is needed for this refactor.

Separate boundary schemas/mappers contain deliberate duplication because HTTP and provider integrations have independent ownership. Parity tests make divergence explicit; do not replace this with a shared Pydantic business model.
