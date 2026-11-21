from typing import Annotated, Literal

from pydantic import Field

from ancora.hints.api.schemas import HintChallenge
from ancora.shared.api.schemas import Version, WireModel, wire_text_limit

Content = Annotated[
    str, Field(max_length=900, min_length=1, pattern=r"\S"), wire_text_limit(900)
]


class CoachingAvailability(WireModel):
    available: bool
    model: (
        Annotated[str, Field(max_length=100, min_length=1), wire_text_limit(100)] | None
    )


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
    technique: Literal["passed", "failed", "inconclusive", "not_required"]
    total: Annotated[int, Field(ge=0, le=12)]


class CoachingFeedback(WireModel):
    next_step: Content
    observations: Annotated[list[Content], Field(max_length=4, min_length=1)]
    summary: Content


class CoachingInput(WireModel):
    challenge: HintChallenge
    evidence: CoachingEvidence
    schema_version: Version
    source: Annotated[
        str,
        Field(max_length=12000, min_length=1, pattern=r"\S"),
        wire_text_limit(12000),
    ]


class CoachingModel(WireModel):
    name: Annotated[str, Field(max_length=100, min_length=1), wire_text_limit(100)]
    prompt_version: Literal["programming-coaching-v1"]
    provider: Literal["openai"]
    schema_version: Version


class CoachingOutput(WireModel):
    feedback: CoachingFeedback
    model: CoachingModel
    schema_version: Version
