"""Construct adapters and own their lifecycle at the process composition root."""

import logging
from collections.abc import AsyncGenerator
from contextlib import AsyncExitStack, asynccontextmanager

from fastapi import FastAPI

from ancora.challenges.api import errors as challenge_errors
from ancora.challenges.api.router import router as challenge_router
from ancora.challenges.application.ports.challenge_generation_provider import (
    ChallengeGenerationProvider,
)
from ancora.challenges.application.use_cases.generate_challenge import (
    GenerateChallenge,
)
from ancora.challenges.infrastructure.ai.openai_challenge_provider import (
    OpenAIChallengeProvider,
)
from ancora.challenges.infrastructure.ai.unavailable import UnavailableChallengeProvider
from ancora.coaching.api import errors as coaching_errors
from ancora.coaching.api.router import COACHING_PATH
from ancora.coaching.api.router import router as coaching_router
from ancora.coaching.application.ports.coaching_provider import CoachingProvider
from ancora.coaching.application.use_cases.generate_coaching_feedback import (
    GenerateCoachingFeedback,
)
from ancora.coaching.infrastructure.ai.openai_coaching_provider import (
    OpenAICoachingProvider,
)
from ancora.coaching.infrastructure.ai.unavailable import UnavailableCoachingProvider
from ancora.config.settings import Settings
from ancora.hints.api import errors as hint_errors
from ancora.hints.api.router import HINTS_PATH
from ancora.hints.api.router import router as hint_router
from ancora.hints.application.ports.hint_provider import HintProvider
from ancora.hints.application.use_cases.generate_hint import GenerateHint
from ancora.hints.infrastructure.ai.openai_hint_provider import OpenAIHintProvider
from ancora.hints.infrastructure.ai.unavailable import UnavailableHintProvider
from ancora.shared.api.errors import register_error_handlers
from ancora.shared.api.middleware import TrustedServerBoundary

API_V1_PREFIX = "/v1"


def create_app(
    settings: Settings | None = None,
    provider: ChallengeGenerationProvider | None = None,
    hint_provider: HintProvider | None = None,
    coaching_provider: CoachingProvider | None = None,
) -> FastAPI:
    configuration = settings or Settings.from_environment()
    owned_provider: OpenAIChallengeProvider | None = None
    if provider is None and configuration.available:
        assert configuration.model is not None and configuration.api_key is not None
        owned_provider = OpenAIChallengeProvider(
            configuration.model, configuration.api_key
        )
    selected_provider = provider or owned_provider or UnavailableChallengeProvider()
    owned_hint_provider: OpenAIHintProvider | None = None
    if hint_provider is None and configuration.hints_available:
        assert configuration.model is not None and configuration.api_key is not None
        owned_hint_provider = OpenAIHintProvider(
            configuration.model, configuration.api_key
        )
    selected_hint_provider = (
        hint_provider or owned_hint_provider or UnavailableHintProvider()
    )

    owned_coaching_provider: OpenAICoachingProvider | None = None
    if coaching_provider is None and configuration.coaching_available:
        assert configuration.model is not None and configuration.api_key is not None
        owned_coaching_provider = OpenAICoachingProvider(
            configuration.model, configuration.api_key
        )
    selected_coaching_provider = (
        coaching_provider or owned_coaching_provider or UnavailableCoachingProvider()
    )

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
        async with AsyncExitStack() as resources:
            if owned_provider is not None:
                resources.push_async_callback(owned_provider.close)
            if owned_hint_provider is not None:
                resources.push_async_callback(owned_hint_provider.close)
            if owned_coaching_provider is not None:
                resources.push_async_callback(owned_coaching_provider.close)
            yield

    app = FastAPI(
        description="Bounded programming challenge generation for the trusted local product server.",
        docs_url=None,
        lifespan=lifespan,
        openapi_url=None,
        redoc_url=None,
        title="Ancora API",
    )
    app.state.generation_provider = selected_provider
    app.state.generate_challenge = GenerateChallenge(selected_provider)
    app.state.hint_provider = selected_hint_provider
    app.state.generate_hint = GenerateHint(selected_hint_provider)
    app.state.coaching_provider = selected_coaching_provider
    app.state.generate_coaching_feedback = GenerateCoachingFeedback(
        selected_coaching_provider
    )

    invalid_request_codes = {
        f"{API_V1_PREFIX}{HINTS_PATH}": "hint_invalid",
        f"{API_V1_PREFIX}{COACHING_PATH}": "coaching_invalid",
    }
    app.add_middleware(
        TrustedServerBoundary,
        invalid_request_codes=invalid_request_codes,
        service_token=configuration.service_token
        if configuration.authenticated
        else None,
    )
    register_error_handlers(app, invalid_request_codes)
    challenge_errors.register_error_handlers(app)
    hint_errors.register_error_handlers(app)
    coaching_errors.register_error_handlers(app)
    app.include_router(challenge_router, prefix=API_V1_PREFIX)
    app.include_router(hint_router, prefix=API_V1_PREFIX)
    app.include_router(coaching_router, prefix=API_V1_PREFIX)
    return app
