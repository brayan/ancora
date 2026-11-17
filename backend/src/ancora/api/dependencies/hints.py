"""Typed FastAPI dependencies for hints; bootstrap owns composition."""

from typing import Annotated, cast

from fastapi import Depends, Request

from ancora.hints.application.interfaces.hint_provider import HintProvider
from ancora.hints.application.use_cases.generate_hint import GenerateHint


def get_generate_hint(request: Request) -> GenerateHint:
    return cast(GenerateHint, request.app.state.generate_hint)


def get_hint_provider(request: Request) -> HintProvider:
    return cast(HintProvider, request.app.state.hint_provider)


GenerateHintDependency = Annotated[GenerateHint, Depends(get_generate_hint)]
HintProviderDependency = Annotated[HintProvider, Depends(get_hint_provider)]
