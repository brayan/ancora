"""Translate feature errors to bounded HTTP responses."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from ancora.hints.application.errors import HintsUnavailable
from ancora.hints.domain.models import HintInvalid


def register_error_handlers(app: FastAPI) -> None:
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
