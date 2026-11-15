"""Construct adapters and own their lifecycle at the process composition root."""

import logging
from collections.abc import AsyncGenerator
from contextlib import AsyncExitStack, asynccontextmanager

from fastapi import FastAPI

from ancora.api.app import create_api
from ancora.application.interfaces.challenge_generation_provider import (
    ChallengeGenerationProvider,
)
from ancora.application.interfaces.hint_provider import HintProvider
from ancora.application.services.challenge_generation_service import (
    ChallengeGenerationService,
)
from ancora.application.services.hint_service import HintService
from ancora.infrastructure.llm.openai_challenge_provider import (
    OpenAIChallengeProvider,
)
from ancora.infrastructure.llm.openai_hint_provider import OpenAIHintProvider
from ancora.infrastructure.llm.unavailable import (
    UnavailableChallengeProvider,
    UnavailableHintProvider,
)
from ancora.settings import Settings


def create_app(
    settings: Settings | None = None,
    provider: ChallengeGenerationProvider | None = None,
    hint_provider: HintProvider | None = None,
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
            yield

    return create_api(
        configuration,
        selected_provider,
        ChallengeGenerationService(selected_provider),
        lifespan,
        selected_hint_provider,
        HintService(selected_hint_provider),
    )
