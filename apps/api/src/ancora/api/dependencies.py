"""FastAPI dependency access; composition remains in bootstrap."""

from typing import Annotated, cast

from fastapi import Depends, Request

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


def get_hint_service(request: Request) -> HintService:
    return cast(HintService, request.app.state.hint_service)


def get_hint_provider(request: Request) -> HintProvider:
    return cast(HintProvider, request.app.state.hint_provider)


HintGenerator = Annotated[HintService, Depends(get_hint_service)]
HintProviderDependency = Annotated[HintProvider, Depends(get_hint_provider)]


def get_coaching_service(request: Request) -> CoachingService:
    return cast(CoachingService, request.app.state.coaching_service)


def get_coaching_provider(request: Request) -> CoachingProvider:
    return cast(CoachingProvider, request.app.state.coaching_provider)


CoachingGenerator = Annotated[CoachingService, Depends(get_coaching_service)]
CoachingProviderDependency = Annotated[CoachingProvider, Depends(get_coaching_provider)]
