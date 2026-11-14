"""FastAPI dependency access; composition remains in bootstrap."""

from typing import Annotated, cast

from fastapi import Depends, Request

from practice_service.application.interfaces.challenge_generation_provider import (
    ChallengeGenerationProvider,
)
from practice_service.application.services.challenge_generation_service import (
    ChallengeGenerationService,
)


def get_generation_service(request: Request) -> ChallengeGenerationService:
    return cast(ChallengeGenerationService, request.app.state.generation_service)


def get_generation_provider(request: Request) -> ChallengeGenerationProvider:
    return cast(ChallengeGenerationProvider, request.app.state.generation_provider)


GenerationService = Annotated[
    ChallengeGenerationService, Depends(get_generation_service)
]
GenerationProvider = Annotated[
    ChallengeGenerationProvider, Depends(get_generation_provider)
]
