"""Public error shapes shared by the trusted HTTP operations."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field


class ApiErrorResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    error: Literal[
        "unauthorized",
        "origin_forbidden",
        "generation_unavailable",
        "provider_interrupted",
        "hint_invalid",
        "hints_unavailable",
        "coaching_invalid",
        "coaching_unavailable",
    ]


class DraftInvalidResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    error: Literal["draft_invalid"]
    issues: Annotated[
        list[Annotated[str, Field(max_length=100, min_length=1)]],
        Field(max_length=10, min_length=1),
    ]
