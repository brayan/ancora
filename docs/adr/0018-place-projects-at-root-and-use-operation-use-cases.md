# ADR 0018: Place projects at root and name application operations as use cases

Status: Accepted — owner requested the root layout, use cases and intent-specific validation modules on 2026-11-17.

## Context

The repository has two applications under `apps/`. The Python project is named
`api` despite containing a domain core, application orchestration and provider
adapters. Its three application services each expose one generation operation;
their domain `rules.py` modules perform deterministic validation. The owner
requested clearer project and operation names throughout the repository.

## Decision

Move `apps/web` to root `web/` and `apps/api` to root `backend/`. Shared
`packages/`, `tools/`, prompts and evals keep their owners. The Python import
package remains `ancora`; its distribution becomes `ancora-backend`. The
TypeScript package remains `@ancora/web`. Update workspaces, locks, root-relative
resources, startup, CI and agent routing together.

Within each Python capability, replace `application/services` with
`application/use_cases`. Move the existing orchestration directly into:

- `challenges/application/use_cases/generate_challenge.py`: `GenerateChallenge.execute`.
- `hints/application/use_cases/generate_hint.py`: `GenerateHint.execute`.
- `coaching/application/use_cases/generate_coaching_feedback.py`: `GenerateCoachingFeedback.execute`.

These operations own the existing availability, provider dispatch and acceptance
workflow. Provider interfaces retain `generate`; no forwarding service or
compatibility wrapper remains. Constructors, provider allowances and interruption
semantics retain their existing contracts.

Rename domain validation modules according to the content they validate:
`draft_validation.py`, `hint_validation.py` and `feedback_validation.py` in their
respective capabilities. Keep the existing pure functions and private helpers.
The application use case invokes these checks; validation is not a separate
application operation. Pydantic stays in HTTP/provider adapters.

The Python `api/` package remains the HTTP boundary, the only production delivery
adapter. `main` starts that HTTP server; bootstrap wires its use cases/providers.
No CLI business operations, workers or alternate delivery layers are introduced.
The Next.js product API, durable-state/migration ownership, trusted-server token
and runner capability boundaries remain as defined in ADRs 0011–0016. This is a
layout and internal naming change, not centralization of product storage in Python.
Next.js retains its feature-first conventions and existing orchestration modules.

## Supersession and validation

This supersedes ADR 0017's outer project paths, distribution name and application
service/module naming, and ADR 0014's corresponding naming. Their framework-free
cores, feature ownership, provider interfaces and exact import boundaries remain.
Earlier ADR trees and dated validation reports describe their historical commits.

Retain all migration, prompt and canonical schema bytes during the moves. Verify
business-function bodies, unchanged dependency resolutions, exact Tach/public
interfaces and whole-core imports without site packages. Run locked setup,
convention preflight, Python checks, repository/contract/disposable-PostgreSQL
checks and the full Google Chrome suite using synthetic providers. Startup,
prompt discovery, contract export and runner paths must resolve from the new root
layout. CI remains provider-free and no existing database or volume is reset.
