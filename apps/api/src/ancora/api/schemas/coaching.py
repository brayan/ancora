from typing import Annotated, Literal

from pydantic import Field

from ancora.api.schemas.generation import Version, WireModel, wire_text_limit
from ancora.api.schemas.hints import HintChallenge

Content = Annotated[
    str, Field(min_length=1, max_length=900, pattern=r"\S"), wire_text_limit(900)
]


class CoachingEvidence(WireModel):
    execution: Literal[
        "result",
        "execution_error",
        "timeout",
        "stopped",
        "output_limit",
        "bootstrap_error",
        "invalid_message",
    ]
    passed: Annotated[int, Field(ge=0, le=12)]
    total: Annotated[int, Field(ge=0, le=12)]
    technique: Literal["passed", "failed", "inconclusive", "not_required"]


class CoachingInput(WireModel):
    schema_version: Version
    challenge: HintChallenge
    source: Annotated[
        str,
        Field(min_length=1, max_length=12000, pattern=r"\S"),
        wire_text_limit(12000),
    ]
    evidence: CoachingEvidence


class CoachingFeedback(WireModel):
    summary: Content
    observations: Annotated[list[Content], Field(min_length=1, max_length=4)]
    next_step: Content


class CoachingModel(WireModel):
    provider: Literal["openai"]
    name: Annotated[str, Field(min_length=1, max_length=100), wire_text_limit(100)]
    prompt_version: Literal["programming-coaching-v1"]
    schema_version: Version


class CoachingOutput(WireModel):
    schema_version: Version
    feedback: CoachingFeedback
    model: CoachingModel


class CoachingAvailability(WireModel):
    available: bool
    model: (
        Annotated[str, Field(min_length=1, max_length=100), wire_text_limit(100)] | None
    )
