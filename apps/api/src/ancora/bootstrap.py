"""Construct adapters and own their lifecycle at the process composition root."""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from ancora.api.app import create_api
from ancora.application.interfaces.challenge_generation_provider import (
    ChallengeGenerationProvider,
)
from ancora.application.services.challenge_generation_service import (
    ChallengeGenerationService,
)
from ancora.infrastructure.llm.openai_challenge_provider import (
    OpenAIChallengeProvider,
)
from ancora.infrastructure.llm.unavailable import UnavailableChallengeProvider
from ancora.settings import Settings


def create_app(
    settings: Settings | None = None,
    provider: ChallengeGenerationProvider | None = None,
) -> FastAPI:
    configuration = settings or Settings.from_environment()
    owned_provider: OpenAIChallengeProvider | None = None
    if provider is None and configuration.available:
        assert configuration.model is not None and configuration.api_key is not None
        owned_provider = OpenAIChallengeProvider(
            configuration.model, configuration.api_key
        )
    selected_provider = provider or owned_provider or UnavailableChallengeProvider()

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
        try:
            yield
        finally:
            if owned_provider is not None:
                await owned_provider.close()

    return create_api(
        configuration,
        selected_provider,
        ChallengeGenerationService(selected_provider),
        lifespan,
    )
