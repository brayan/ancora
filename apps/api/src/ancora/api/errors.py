"""Expose bounded issue codes; never echo validation input or provider messages."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from ancora.application.coaching import CoachingUnavailable
from ancora.application.errors import (
    GenerationUnavailable,
    ProviderInterrupted,
)
from ancora.application.hints import HintsUnavailable
from ancora.domain.challenges.errors import DraftInvalid
from ancora.domain.coaching.models import CoachingInvalid
from ancora.domain.hints.models import HintInvalid


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def request_invalid(
        _request: Request,
        _error: RequestValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            {"error": "hint_invalid"}
            if _request.url.path == "/v1/hints"
            else {"error": "coaching_invalid"}
            if _request.url.path == "/v1/coaching"
            else {"error": "draft_invalid", "issues": ["request_invalid"]},
            status_code=422,
        )

    @app.exception_handler(ValidationError)
    async def structure_invalid(
        _request: Request,
        _error: ValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            {"error": "hint_invalid"}
            if _request.url.path == "/v1/hints"
            else {"error": "coaching_invalid"}
            if _request.url.path == "/v1/coaching"
            else {"error": "draft_invalid", "issues": ["structure_invalid"]},
            status_code=422,
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

    @app.exception_handler(HintInvalid)
    async def hint_invalid(
        _request: Request,
        _error: HintInvalid,
    ) -> JSONResponse:
        return JSONResponse({"error": "hint_invalid"}, status_code=422)

    @app.exception_handler(HintsUnavailable)
    async def hints_unavailable(
        _request: Request,
        _error: HintsUnavailable,
    ) -> JSONResponse:
        return JSONResponse({"error": "hints_unavailable"}, status_code=503)

    @app.exception_handler(CoachingInvalid)
    async def coaching_invalid(
        _request: Request,
        _error: CoachingInvalid,
    ) -> JSONResponse:
        return JSONResponse({"error": "coaching_invalid"}, status_code=422)

    @app.exception_handler(CoachingUnavailable)
    async def coaching_unavailable(
        _request: Request,
        _error: CoachingUnavailable,
    ) -> JSONResponse:
        return JSONResponse({"error": "coaching_unavailable"}, status_code=503)
