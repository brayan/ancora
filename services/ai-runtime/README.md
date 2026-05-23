# AI Runtime

## Start Here

This module is the FastAPI boundary for Ancora's v1 product API and AI API. It owns account-aware product behavior and future AI workflows; the web app calls it over HTTP.

Useful commands:

```bash
cd services/ai-runtime
uv run --project . --group dev ruff check .
uv run --project . --group dev pytest
uv run --project . uvicorn ancora_ai_runtime.main:app --app-dir src --reload
```

The current scaffold exposes `GET /health` only. Do not add auth, RAG, OpenAI calls, migrations, or product features from scaffold prompts.
