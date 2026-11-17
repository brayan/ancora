"""Typed FastAPI dependencies for coaching; bootstrap owns composition."""

from typing import Annotated, cast

from fastapi import Depends, Request

from ancora.coaching.application.interfaces.coaching_provider import CoachingProvider
from ancora.coaching.application.services.coaching_service import CoachingService


def get_coaching_service(request: Request) -> CoachingService:
    return cast(CoachingService, request.app.state.coaching_service)


def get_coaching_provider(request: Request) -> CoachingProvider:
    return cast(CoachingProvider, request.app.state.coaching_provider)


CoachingGenerator = Annotated[CoachingService, Depends(get_coaching_service)]


CoachingProviderDependency = Annotated[CoachingProvider, Depends(get_coaching_provider)]
