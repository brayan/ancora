"""Expose bounded validation and interruption codes without request contents."""

from collections.abc import Mapping

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from ancora.shared.application.errors import ProviderInterrupted


def register_error_handlers(
    app: FastAPI,
    invalid_request_codes: Mapping[str, str],
) -> None:
    @app.exception_handler(RequestValidationError)
    async def request_invalid(
        request: Request,
        _error: RequestValidationError,
    ) -> JSONResponse:
        return validation_error_response(
            invalid_request_codes, request.url.path, "request_invalid"
        )

    @app.exception_handler(ValidationError)
    async def structure_invalid(
        request: Request,
        _error: ValidationError,
    ) -> JSONResponse:
        return validation_error_response(
            invalid_request_codes, request.url.path, "structure_invalid"
        )

    @app.exception_handler(ProviderInterrupted)
    async def provider_interrupted(
        _request: Request,
        _error: ProviderInterrupted,
    ) -> JSONResponse:
        return JSONResponse({"error": "provider_interrupted"}, status_code=502)


def validation_error_response(
    invalid_request_codes: Mapping[str, str],
    path: str,
    issue: str,
) -> JSONResponse:
    error_code = invalid_request_codes.get(path)
    if error_code is not None:
        return JSONResponse({"error": error_code}, status_code=422)

    return JSONResponse({"error": "draft_invalid", "issues": [issue]}, status_code=422)
