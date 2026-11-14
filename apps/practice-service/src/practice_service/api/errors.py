"""Expose bounded issue codes; never echo validation input or provider messages."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from practice_service.application.errors import (
    GenerationUnavailable,
    ProviderInterrupted,
)
from practice_service.domain.challenges.errors import DraftInvalid


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def request_invalid(
        _request: Request,
        _error: RequestValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            {"error": "draft_invalid", "issues": ["request_invalid"]}, status_code=422
        )

    @app.exception_handler(ValidationError)
    async def structure_invalid(
        _request: Request,
        _error: ValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            {"error": "draft_invalid", "issues": ["structure_invalid"]}, status_code=422
        )

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

    @app.exception_handler(ProviderInterrupted)
    async def provider_interrupted(
        _request: Request,
        _error: ProviderInterrupted,
    ) -> JSONResponse:
        return JSONResponse({"error": "provider_interrupted"}, status_code=502)
