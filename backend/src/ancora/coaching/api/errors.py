"""Translate feature errors to bounded HTTP responses."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from ancora.coaching.application.errors import CoachingUnavailable
from ancora.coaching.domain.models import CoachingInvalid


def register_error_handlers(app: FastAPI) -> None:
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
