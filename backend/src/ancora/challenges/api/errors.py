"""Translate feature errors to bounded HTTP responses."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from ancora.challenges.application.errors import GenerationUnavailable
from ancora.challenges.domain.errors import DraftInvalid


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DraftInvalid)
    async def draft_invalid(
        _request: Request,
        error: DraftInvalid,
    ) -> JSONResponse:
        return JSONResponse(
            {"error": "draft_invalid", "issues": [error.issue]}, status_code=422
        )

    @app.exception_handler(GenerationUnavailable)
    async def generation_unavailable(
        _request: Request,
        _error: GenerationUnavailable,
    ) -> JSONResponse:
        return JSONResponse({"error": "generation_unavailable"}, status_code=503)
