# ADR 0019: Use callable Python use cases

Status: Accepted — owner selected `__call__` as the Python use-case entrypoint on 2026-11-18.

## Context

ADR 0018 introduced operation-oriented application use cases with an `execute`
method. The owner requested callable instances as the shared Python convention.
The existing operations contain required validation around one provider dispatch;
the rule against artificial delegation wrappers remains in force.

## Decision

Use `__call__` as the single execution entrypoint for the three asynchronous
operations.

- `GenerateChallenge`: availability, draft acceptance and one generation dispatch.
- `GenerateHint`: progression, case values, output and provenance validation.
- `GenerateCoachingFeedback`: bounded input, case values, feedback and provenance.

Name each concrete instance after its class in `snake_case`. For example, a
`GenerateChallenge` instance is `generate_challenge` and the caller uses
`await generate_challenge(command)`. Reserve `use_case` for code that handles
operations generically.

Preserve constructor-injected application interfaces and typed commands/results.
FastAPI dependencies supply operation instances; routers map transport input,
invoke the instance and map the result. Keep Pydantic at API/infrastructure
boundaries. Provider interfaces retain `generate`; this decision changes the
application operation entrypoint only. Synchronous future use cases may implement
`def __call__` and be invoked without `await`.

Remove the old `execute` method rather than retaining a forwarding alias. Do not
add parallel `run`/`call` entrypoints, base classes or wrappers. Operations must
still own required behavior beyond delegation; trivial consumers use existing
public application/domain contracts directly within the exact import graph.

## Supersession and acceptance

This supersedes only ADR 0018's `execute` entrypoint naming. Its root layout,
feature ownership, domain validation and anti-wrapper decisions remain accepted.
Older ADRs and dated test reports retain their original method names as history.

Verify direct callable invocation through business tests and all three HTTP
routers. Preserve operation-body behavior, response schemas, dispatch/error
semantics, architecture boundaries and privacy. Run the locked Python quality,
typing, architecture and test lane plus contract/context checks with synthetic
providers. No paid requests, database migrations or execution-boundary changes
are required.
