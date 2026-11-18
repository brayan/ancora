"""Construct adapters and own their lifecycle at the process composition root."""

import logging
from collections.abc import AsyncGenerator
from contextlib import AsyncExitStack, asynccontextmanager

from fastapi import FastAPI

from ancora.api.app import create_api
from ancora.challenges.application.interfaces.challenge_generation_provider import (
    ChallengeGenerationProvider,
)
from ancora.challenges.application.use_cases.generate_challenge import (
    GenerateChallenge,
)
from ancora.challenges.infrastructure.ai.openai_challenge_provider import (
    OpenAIChallengeProvider,
)
from ancora.challenges.infrastructure.ai.unavailable import UnavailableChallengeProvider
from ancora.coaching.application.interfaces.coaching_provider import CoachingProvider
from ancora.coaching.application.use_cases.generate_coaching_feedback import (
    GenerateCoachingFeedback,
)
from ancora.coaching.infrastructure.ai.openai_coaching_provider import (
    OpenAICoachingProvider,
)
from ancora.coaching.infrastructure.ai.unavailable import UnavailableCoachingProvider
from ancora.config.settings import Settings
from ancora.hints.application.interfaces.hint_provider import HintProvider
from ancora.hints.application.use_cases.generate_hint import GenerateHint
from ancora.hints.infrastructure.ai.openai_hint_provider import OpenAIHintProvider
from ancora.hints.infrastructure.ai.unavailable import UnavailableHintProvider


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

    return create_api(
        configuration,
        selected_provider,
        GenerateChallenge(selected_provider),
        lifespan,
        selected_hint_provider,
        GenerateHint(selected_hint_provider),
        selected_coaching_provider,
        GenerateCoachingFeedback(selected_coaching_provider),
    )
