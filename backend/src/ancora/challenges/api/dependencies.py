"""Typed FastAPI dependencies for generation; bootstrap owns composition."""

from typing import Annotated, cast

from fastapi import Depends, Request

from ancora.challenges.application.ports.challenge_generation_provider import (
    ChallengeGenerationProvider,
)
from ancora.challenges.application.use_cases.generate_challenge import (
    GenerateChallenge,
)


def get_generate_challenge(request: Request) -> GenerateChallenge:
    return cast(GenerateChallenge, request.app.state.generate_challenge)


def get_generation_provider(request: Request) -> ChallengeGenerationProvider:
    return cast(ChallengeGenerationProvider, request.app.state.generation_provider)


GenerateChallengeDependency = Annotated[
    GenerateChallenge, Depends(get_generate_challenge)
]
GenerationProvider = Annotated[
    ChallengeGenerationProvider, Depends(get_generation_provider)
]
