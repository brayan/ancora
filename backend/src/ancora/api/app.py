"""Compose HTTP delivery without constructing infrastructure adapters."""

from fastapi import FastAPI
from starlette.types import Lifespan

from ancora.api.errors import register_error_handlers
from ancora.api.middleware import TrustedServerBoundary
from ancora.api.routers import coaching, generation, hints, status
from ancora.challenges.application.interfaces.challenge_generation_provider import (
    ChallengeGenerationProvider,
)
from ancora.challenges.application.use_cases.generate_challenge import (
    GenerateChallenge,
)
from ancora.coaching.application.interfaces.coaching_provider import CoachingProvider
from ancora.coaching.application.use_cases.generate_coaching_feedback import (
    GenerateCoachingFeedback,
)
from ancora.config.settings import Settings
from ancora.hints.application.interfaces.hint_provider import HintProvider
from ancora.hints.application.use_cases.generate_hint import GenerateHint


def create_api(
    settings: Settings,
    provider: ChallengeGenerationProvider,
    generate_challenge: GenerateChallenge,
    lifespan: Lifespan[FastAPI],
    hint_provider: HintProvider,
    generate_hint: GenerateHint,
    coaching_provider: CoachingProvider,
    generate_coaching_feedback: GenerateCoachingFeedback,
) -> FastAPI:
    app = FastAPI(
        description="Bounded programming challenge generation for the trusted local product server.",
        docs_url=None,
        lifespan=lifespan,
        openapi_url=None,
        redoc_url=None,
        title="Ancora API",
    )
    app.state.generation_provider = provider
    app.state.generate_challenge = generate_challenge
    app.state.hint_provider = hint_provider
    app.state.generate_hint = generate_hint
    app.state.coaching_provider = coaching_provider
    app.state.generate_coaching_feedback = generate_coaching_feedback

    app.add_middleware(TrustedServerBoundary, settings=settings)
    register_error_handlers(app)
    app.include_router(status.router, prefix="/v1")
    app.include_router(generation.router, prefix="/v1")
    app.include_router(hints.router, prefix="/v1")
    app.include_router(coaching.router, prefix="/v1")
    return app
