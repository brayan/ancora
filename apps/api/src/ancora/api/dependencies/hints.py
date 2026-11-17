"""Typed FastAPI dependencies for hints; bootstrap owns composition."""

from typing import Annotated, cast

from fastapi import Depends, Request

from ancora.hints.application.interfaces.hint_provider import HintProvider
from ancora.hints.application.services.hint_service import HintService


def get_hint_service(request: Request) -> HintService:
    return cast(HintService, request.app.state.hint_service)


def get_hint_provider(request: Request) -> HintProvider:
    return cast(HintProvider, request.app.state.hint_provider)


HintGenerator = Annotated[HintService, Depends(get_hint_service)]
HintProviderDependency = Annotated[HintProvider, Depends(get_hint_provider)]
