"""Compose HTTP delivery without constructing infrastructure adapters."""

from fastapi import FastAPI
from starlette.types import Lifespan

from ancora.api.errors import register_error_handlers
from ancora.api.middleware import TrustedServerBoundary
from ancora.api.routers import coaching, generation, hints, status
from ancora.application.interfaces.challenge_generation_provider import (
    ChallengeGenerationProvider,
)
from ancora.application.interfaces.coaching_provider import CoachingProvider
from ancora.application.interfaces.hint_provider import HintProvider
from ancora.application.services.challenge_generation_service import (
    ChallengeGenerationService,
)
from ancora.application.services.coaching_service import CoachingService
from ancora.application.services.hint_service import HintService
from ancora.settings import Settings


def create_api(
    settings: Settings,
    provider: ChallengeGenerationProvider,
    service: ChallengeGenerationService,
    lifespan: Lifespan[FastAPI],
    hint_provider: HintProvider,
    hint_service: HintService,
    coaching_provider: CoachingProvider,
    coaching_service: CoachingService,
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
    app.state.hint_provider = hint_provider
    app.state.hint_service = hint_service
    app.state.coaching_provider = coaching_provider
    app.state.coaching_service = coaching_service

    app.add_middleware(TrustedServerBoundary, settings=settings)
    register_error_handlers(app)
    app.include_router(status.router, prefix="/v1")
    app.include_router(generation.router, prefix="/v1")
    app.include_router(hints.router, prefix="/v1")
    app.include_router(coaching.router, prefix="/v1")
    return app
