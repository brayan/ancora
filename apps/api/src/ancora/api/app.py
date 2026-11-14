"""Compose HTTP delivery without constructing infrastructure adapters."""

from fastapi import FastAPI
from starlette.types import Lifespan

from ancora.api.errors import register_error_handlers
from ancora.api.middleware import TrustedServerBoundary
from ancora.api.routers import generation, status
from ancora.application.interfaces.challenge_generation_provider import (
    ChallengeGenerationProvider,
)
from ancora.application.services.challenge_generation_service import (
    ChallengeGenerationService,
)
from ancora.settings import Settings


def create_api(
    settings: Settings,
    provider: ChallengeGenerationProvider,
    service: ChallengeGenerationService,
    lifespan: Lifespan[FastAPI],
) -> FastAPI:
    app = FastAPI(
        title="Ancora API",
        description="Bounded programming challenge generation for the trusted local product server.",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
        lifespan=lifespan,
    )
    app.state.generation_provider = provider
    app.state.generation_service = service

    app.add_middleware(TrustedServerBoundary, settings=settings)
    register_error_handlers(app)
    app.include_router(status.router, prefix="/v1")
    app.include_router(generation.router, prefix="/v1")
    return app
