# Practice service

FastAPI owns one bounded challenge-generation dispatch. Next.js owns durable lifecycle, initial plus one explicit correction allowance and all database writes. Reference and learner Python execute only in the isolated browser runner; this service only parses reference AST and JSON cases.

From repository root, install the pinned uv version then `uv sync --frozen --all-packages`. Start with `uv run --frozen --all-packages python -m practice_service.main`; it binds `127.0.0.1:8001`, with no CORS, OpenAPI or access logging. It requires Python >=3.13,<3.15. The versioned prompt is read from this repository checkout.

Server environment:

- `PRACTICE_SERVICE_TOKEN`: at least 32 characters, shared only with trusted Next.js; every endpoint requires `Authorization: Bearer <token>`. Any `Origin` header is rejected.
- `PRACTICE_GENERATION_ENABLED=1`, `PRACTICE_MODEL` and `OPENAI_API_KEY`: all must be explicitly configured to enable OpenAI. There is no default model or fake fallback. Starting the service makes no provider call; generating with valid configuration does.

`GET /v1/status` returns `{available, model}`. `POST /v1/generate` accepts and returns the exact camelCase schemas exported in `packages/schemas/generation-v1.schema.json`. It accepts a complete `previous` draft plus bounded feedback for an explicitly authorized correction. Neither this process nor SDK/framework/transport layers retry: one service call means at most one provider request. OpenAI Responses uses strict native structured output and `store=false`. Provider prompts/responses and credentials are never logged or traced by service code.

Safe errors: `draft_invalid` (422, optional bounded issue codes), `provider_interrupted` (502, uncertain dispatch consumed), `generation_unavailable` (503), `unauthorized` (401) and `origin_forbidden` (403). Validation errors never echo request/source/provider text. Refused, malformed or incomplete model output is rejected without correction. Byte limits: request <=200000; reference plus combined cases <=50000, leaving runner-envelope headroom. Structural checks cannot establish arbitrary natural-language semantic correctness; browser reference checks follow.

Focused offline checks:

```
uv run --frozen --all-packages ruff check apps/practice-service
uv run --frozen --all-packages ruff format --check apps/practice-service
uv run --frozen --all-packages pyright apps/practice-service/src apps/practice-service/tests
uv run --frozen --all-packages pytest apps/practice-service/tests
```

For disposable browser integration only, run `uv run --frozen --all-packages python apps/practice-service/tests/serve_synthetic.py` with both `ANCORA_SYNTHETIC_DATABASE=1` and `ANCORA_SYNTHETIC_PROVIDER=1` and a valid service token. This explicit test module injects a typed synthetic generator; it is outside the production package. No provider credentials are needed. Do not use its authored exercises as production content. No database dependencies or code-execution helpers exist here.

API behavior was checked against the installed locked Pydantic AI/OpenAI packages and the official [Pydantic AI output documentation](https://ai.pydantic.dev/output/) and [OpenAI structured output guide](https://developers.openai.com/api/docs/guides/structured-outputs). No paid calls or live quality evaluation ran.
