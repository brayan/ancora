"""Typed FastAPI dependencies for coaching; bootstrap owns composition."""

from typing import Annotated, cast

from fastapi import Depends, Request

from ancora.coaching.application.interfaces.coaching_provider import CoachingProvider
from ancora.coaching.application.use_cases.generate_coaching_feedback import (
    GenerateCoachingFeedback,
)


def get_generate_coaching_feedback(request: Request) -> GenerateCoachingFeedback:
    return cast(GenerateCoachingFeedback, request.app.state.generate_coaching_feedback)


def get_coaching_provider(request: Request) -> CoachingProvider:
    return cast(CoachingProvider, request.app.state.coaching_provider)


CoachingProviderDependency = Annotated[CoachingProvider, Depends(get_coaching_provider)]
GenerateCoachingFeedbackDependency = Annotated[
    GenerateCoachingFeedback, Depends(get_generate_coaching_feedback)
]
