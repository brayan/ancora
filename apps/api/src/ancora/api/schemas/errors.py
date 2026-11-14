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
    ]


class DraftInvalidResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    error: Literal["draft_invalid"]
    issues: Annotated[
        list[Annotated[str, Field(min_length=1, max_length=100)]],
        Field(min_length=1, max_length=10),
    ]
