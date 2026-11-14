"""Trusted Next.js boundary; browser requests and unsafe errors stop here."""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from practice_service.contracts import GeneratorInput, GeneratorOutput, ModelProvenance
from practice_service.generation import (
    ChallengeGenerator,
    GenerationUnavailable,
    ProviderInterrupted,
    UnavailableGenerator,
)
from practice_service.provider import OpenAIChallengeGenerator
from practice_service.security import TrustedServerBoundary
from practice_service.settings import Settings
from practice_service.validation import DraftInvalid, validate_draft


def create_app(
    settings: Settings | None = None, generator: ChallengeGenerator | None = None
) -> FastAPI:
    configuration = settings or Settings.from_environment()
    owned_generator: OpenAIChallengeGenerator | None = None
    if generator is None and configuration.available:
        assert configuration.model is not None and configuration.api_key is not None
        owned_generator = OpenAIChallengeGenerator(
            configuration.model, configuration.api_key
        )
    selected_generator = generator or owned_generator or UnavailableGenerator()

    # SDK debug output can include prompts/keys; never enable it for this process.
    for name in (
        "openai",
        "httpx",
        "httpx2",
        "httpcore",
        "pydantic_ai",
        "uvicorn.access",
    ):
        logger = logging.getLogger(name)
        logger.setLevel(logging.CRITICAL + 1)
        logger.disabled = True

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
        yield
        if owned_generator is not None:
            await owned_generator.close()

    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)

    app.add_middleware(TrustedServerBoundary, settings=configuration)

    @app.exception_handler(RequestValidationError)
    async def request_invalid(
        _request: Request, _error: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            {"error": "draft_invalid", "issues": ["request_invalid"]}, status_code=422
        )

    @app.get("/v1/status")
    async def status() -> dict[str, bool | str | None]:
        return {
            "available": selected_generator.available,
            "model": selected_generator.model,
        }

    @app.post("/v1/generate", response_model=GeneratorOutput)
    async def generate(
        generation_input: GeneratorInput,
    ) -> GeneratorOutput | JSONResponse:
        try:
            if not selected_generator.available:
                raise GenerationUnavailable
            draft = await selected_generator.generate(generation_input)
            validate_draft(draft, generation_input.request)
            if selected_generator.model is None:
                raise GenerationUnavailable
            return GeneratorOutput.model_validate(
                {
                    "schemaVersion": 1,
                    "draft": draft,
                    "model": ModelProvenance.model_validate(
                        {
                            "provider": "openai",
                            "name": selected_generator.model,
                            "promptVersion": "programming-practice-v1",
                            "schemaVersion": 1,
                        }
                    ),
                }
            )
        except (DraftInvalid, ValidationError) as error:
            issue = (
                error.issue if isinstance(error, DraftInvalid) else "structure_invalid"
            )
            return JSONResponse(
                {"error": "draft_invalid", "issues": [issue]}, status_code=422
            )
        except GenerationUnavailable:
            return JSONResponse({"error": "generation_unavailable"}, status_code=503)
        except ProviderInterrupted:
            return JSONResponse({"error": "provider_interrupted"}, status_code=502)

    return app
