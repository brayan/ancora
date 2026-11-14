"""Compose HTTP delivery without constructing infrastructure adapters."""

from fastapi import FastAPI
from starlette.types import Lifespan

from practice_service.api.errors import register_error_handlers
from practice_service.api.middleware import TrustedServerBoundary
from practice_service.api.routers import generation, status
from practice_service.application.interfaces.challenge_generation_provider import (
    ChallengeGenerationProvider,
)
from practice_service.application.services.challenge_generation_service import (
    ChallengeGenerationService,
)
from practice_service.settings import Settings


def create_api(
    settings: Settings,
    provider: ChallengeGenerationProvider,
    service: ChallengeGenerationService,
    lifespan: Lifespan[FastAPI],
) -> FastAPI:
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)
    app.state.generation_provider = provider
    app.state.generation_service = service

    app.add_middleware(TrustedServerBoundary, settings=settings)
    register_error_handlers(app)
    app.include_router(status.router, prefix="/v1")
    app.include_router(generation.router, prefix="/v1")
    return app
