from __future__ import annotations

import json
from typing import Any

from fastapi import FastAPI


def create_app() -> FastAPI:
    app = FastAPI(
        title="Ancora AI Runtime",
        version="0.1.0",
        summary="FastAPI product API and AI API boundary for Ancora.",
    )

    @app.get("/health", tags=["system"])
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "ai-runtime"}

    return app


app = create_app()


def run() -> None:
    payload: dict[str, Any] = {"app": "ancora-ai-runtime", "status": "ready"}
    print(json.dumps(payload, sort_keys=True))
