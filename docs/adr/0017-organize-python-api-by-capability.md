# ADR 0017: Organize the Python API by capability

Status: Accepted — owner requested Lumera/playbook structure alignment on 2026-11-17.

## Context

ADR 0014 established plain domain/application models, application services, provider interfaces and separate HTTP/provider schemas. Generation, hints and coaching now span three package-wide layer trees, so changing one capability requires navigating each tree. The owner requested Lumera's feature-first FastAPI structure in the existing standards-alignment worktree and PR.

References inspected: Lumera's [Python service foundation](https://github.com/brayan/sailtech/tree/4dea6fa8595e2210d29b8e16d73f56b37210e463/apps/lumera/service) and [feature contracts/shared domain structure](https://github.com/brayan/sailtech/tree/27dc45bf4e12b4c599ecd0335ced041dcdf3d267/apps/lumera/service), plus the playbook's [Python service conventions](https://github.com/brayan/engineering-playbook/blob/main/docs/backend/python-service-conventions.md) and [AI capability guidance](https://github.com/brayan/engineering-playbook/blob/main/docs/engineering/ai-capability-standards.md). The inspected playbook checkout also contained unpublished structure/AI documentation edits. They were read as draft guidance and remain untouched; this ADR records Ancora's owner-approved decision rather than claiming those edits are merged or making them a CI dependency.

## Decision

Keep `apps/api`, distribution `ancora-api`, import package `ancora` and the existing workspace/tool locks. Inside `ancora` use:

```text
api/
  app.py, middleware.py, errors.py, responses.py
  dependencies/{generation,hints,coaching}.py
  routers/, schemas/, mappers/          # Capability-specific HTTP boundaries
config/settings.py
challenges/
  domain/                              # Challenge contracts, values and acceptance rules
  application/{models.py,errors.py,interfaces/,services/}
  infrastructure/ai/                   # Provider, provider schemas/mappers, unavailable adapter
hints/
  domain/
  application/{models.py,errors.py,interfaces/,services/}
  infrastructure/ai/
coaching/
  domain/
  application/{models.py,errors.py,interfaces/,services/}
  infrastructure/ai/
shared/application/errors.py           # ProviderInterrupted, already used by all three capabilities
bootstrap.py
main.py
```

Create only packages containing existing behavior. Retain `interfaces` as Ancora's agreed name for provider contracts. Services coordinate meaningful workflows; no forwarding use-case wrappers, generic repositories, global AI package or framework-named package tree is introduced. AI infrastructure belongs to its product capability.

Challenge function/example contracts and finite-value validation remain owned by `challenges/domain`, with explicit public imports for hints/coaching. Their use does not transfer ownership of challenge-generation rules. Do not move feature-owned models into a generic shared package merely because another feature consumes their public contract. Only the existing common provider-interruption error moves to `shared/application`.

Domain/application packages remain standard-library-only and framework-free. Pydantic stays in API/provider adapters with explicit mapping. API and infrastructure are sibling outer adapters; bootstrap alone binds them. Configuration parsing belongs to `config`; main retains the existing loopback Uvicorn entrypoint. Split HTTP dependency accessors by capability while keeping routes and schema artifacts stable.

The exact Tach graph models each capability's domain/application/interfaces/services/infrastructure and the shared/config/bootstrap boundaries. Public-interface rules keep challenge validation internals private, and unrelated features cannot import one another's application internals or concrete adapters. The shared domain-import guard discovers all nested domain packages. Pytest must inspect every nested application package and import the whole core without site packages; moving folders cannot create a validation blind spot.

## Compatibility and validation

This supersedes ADR 0014's package-wide layer placement only. Existing services, interface semantics, positional constructor contracts, provider dispatch limits, prompts, HTTP methods/paths/errors and canonical wire schemas remain unchanged. Next.js retains all durable-state and migration ownership. No dependency upgrade, new migration, provider call, auth restoration or runner capability change is part of this layout refactor.

Update production/test/tool imports and provider prompt-file paths together. Validate locked Python checks, exact import edges and public interfaces, nested core purity, schema parity, startup/lifecycle and offline provider tests. Run repository checks and real Chrome generation/hints/coaching regressions with synthetic providers. Preserve previous standards/runner changes in the same owner-requested PR; do not publish until the combined result passes.
