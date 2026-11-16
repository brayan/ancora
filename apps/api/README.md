# Ancora API

The backend lives in `apps/api`, imports as `ancora`, and is installed as the `ancora-api` distribution. FastAPI owns bounded challenge generation, progressive hints and selected-attempt coaching. Next.js owns durable lifecycle, dispatch allowances and all database writes. Reference and learner Python execute only in the isolated browser runner; this service only parses reference AST and JSON cases.

The package separates `api/` routers/schemas/mappers, `application/services/` orchestration and `application/interfaces/` provider dependencies, framework-free `domain/` challenge/hint/coaching models/rules, and `infrastructure/llm/` adapters/schemas/mappers. `bootstrap.create_app` wires resources; `main` starts the service. Neither domain nor application imports Pydantic. See [ADR 0014](../../docs/adr/0014-layer-generation-around-a-framework-free-core.md) for structure and dependency rules.

From repository root, install the pinned uv version then `uv sync --frozen --all-packages`. Start with `uv run --frozen --all-packages python -m ancora.main`; it binds `127.0.0.1:8001`, with no CORS or access logging. Swagger, ReDoc and OpenAPI HTTP routes are disabled. It requires Python >=3.13,<3.15. The versioned prompt is read from this repository checkout.

Server environment:

- `PRACTICE_SERVICE_TOKEN`: at least 32 characters, shared only with trusted Next.js; every endpoint requires `Authorization: Bearer <token>`. Any `Origin` header is rejected.
- `PRACTICE_GENERATION_ENABLED=1`, `PRACTICE_MODEL` and `OPENAI_API_KEY`: all must be explicitly configured to enable OpenAI. There is no default model or fake fallback. Starting the service makes no provider call; generating with valid configuration does.

`GET /v1/status` returns `{available, model}`. `POST /v1/generate` accepts and returns the exact camelCase schemas exported in `packages/schemas/generation-v1.schema.json`. It accepts a complete `previous` draft plus bounded feedback for an explicitly authorized correction. Neither this process nor SDK/framework/transport layers retry: one service call means at most one provider request. OpenAI Responses uses strict native structured output and `store=false`. Provider prompts/responses and credentials are never logged or traced by service code.

Both routers provide summaries, tags, behavioral docstrings and typed error-response metadata. `app.openapi()` builds their documentation in-process without contacting the provider. `status` describes configured availability rather than a provider health/credit probe; disabled generation returns HTTP 200 with `available=false`. `generate` documents its potential paid dispatch and the separate browser validation required before a draft becomes ready. Shared middleware errors cover missing/incorrect server tokens (401), Origin headers (403), oversized request bodies (422) and missing trusted-server configuration (503). Generation additionally documents draft/contract failures (422), provider interruption (502) and unavailable generation (503). Documentation tests check these projections and keep `/docs`, `/redoc` and `/openapi.json` unavailable over HTTP.

Safe errors: `draft_invalid` (422, optional bounded issue codes), `provider_interrupted` (502, uncertain dispatch consumed), `generation_unavailable` (503), `unauthorized` (401) and `origin_forbidden` (403). Validation errors never echo request/source/provider text. Refused, malformed or incomplete model output is rejected without correction. Byte limits: request <=200000; reference plus combined cases <=50000, leaving runner-envelope headroom. Structural checks cannot establish arbitrary natural-language semantic correctness; browser reference checks follow.

Focused offline checks:

```
pnpm python:architecture
uv run --frozen --all-packages ruff check apps/api
uv run --frozen --all-packages ruff format --check apps/api
uv run --frozen --all-packages pyright apps/api/src apps/api/tests
uv run --frozen --all-packages pytest apps/api/tests
```

The root Tach graph enforces ADR 0014's layers and public interfaces. It also runs in `pnpm python:check` and the existing offline Python CI job. Architecture tests verify deliberately forbidden imports in temporary copies, while separate checks retain the framework-free core guarantee. See [Python conventions](../../docs/engineering/python-conventions.md#architecture-guard) before changing the graph.

For disposable browser integration only, run `uv run --frozen --all-packages python apps/api/tests/serve_synthetic.py` with both `ANCORA_SYNTHETIC_DATABASE=1` and `ANCORA_SYNTHETIC_PROVIDER=1` and a valid service token. This explicit test module injects a typed synthetic generator; it is outside the production package. No provider credentials are needed. Do not use its authored exercises as production content. No database dependencies or code-execution helpers exist here.

API behavior is checked offline against the installed locked Pydantic AI/OpenAI packages. The initial manual pilot and owner acceptance are recorded separately in [the generation plan](../../docs/exec-plans/challenge-generation.md); CI and this structural refactor make no paid calls.

## Progressive hints

Enable independently with `PRACTICE_HINTS_ENABLED=1` and the existing model/key/token environment. `GET /v1/hints/status` reports hint configuration without contacting the provider. `POST /v1/hints` accepts only public challenge context, the requested level and earlier hints; it makes one bounded dispatch and returns hint text/provenance. Neither endpoint accepts learner code or reference/hidden material. Next.js owns persistence, sequential levels, shared initial/retry allowances and attempt assistance snapshots. `hint_invalid` (422), `hints_unavailable` (503) and `provider_interrupted` (502) are bounded outcomes; no automatic retry or solution execution occurs.

The hints capability follows ADR 0014's plain core and independent API/infrastructure Pydantic boundaries. Routers document success/error responses in-process. See [ADR 0015](../../docs/adr/0015-persist-bounded-progressive-hints.md) and [the lifecycle](../../docs/architecture/progressive-hints.md). The synthetic browser service injects both generation and hint providers, with no real credentials. The selected-attempt coaching capability is documented below.

## Selected-attempt coaching

Enable independently with `PRACTICE_COACHING_ENABLED=1` and existing model/key/token settings. `GET /v1/coaching/status` reads configuration without a provider probe; `POST /v1/coaching` makes one bounded call with saved source, public context and aggregate execution evidence. Next.js owns affirmative sharing confirmation for initial/retry requests, persistence, dispatch allowance and assistance snapshots. Errors are `coaching_invalid` (422), `coaching_unavailable` (503) and `provider_interrupted` (502), plus shared trusted-server errors. Source, provider output and raw exceptions are never logged/traced. No source executes here.

The prompt is `programming-coaching-v1`; wire schemas are `coaching-v1.schema.json`. Plain domain/application values and independent API/provider Pydantic schemas follow ADR 0014. Routers document paid dispatch separately from configuration status. The test-only server injects all three typed providers with synthetic source and no real credentials. See [ADR 0016](../../docs/adr/0016-persist-selected-attempt-coaching.md) and [the sharing/lifecycle contract](../../docs/architecture/selected-attempt-coaching.md). Manual quality evaluation remains deferred; CI stays offline.
