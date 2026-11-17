from typing import Annotated, Literal

from pydantic import Field

from ancora.api.schemas.generation import (
    FunctionContract,
    Requirement,
    Version,
    WireModel,
    wire_text_limit,
)
from ancora.challenges.domain.models import Technique

Content = Annotated[
    str, Field(max_length=1800, min_length=1, pattern=r"\S"), wire_text_limit(1800)
]
Integer = Annotated[int, Field(ge=-1_000_000, le=1_000_000)]
Key = Annotated[str, Field(max_length=100), wire_text_limit(100)]
Level = Annotated[int, Field(ge=1, le=3)]
Text = Annotated[str, Field(max_length=2000), wire_text_limit(2000)]

Value = (
    Integer
    | Text
    | Annotated[list[Integer], Field(max_length=1000)]
    | Annotated[list[Text], Field(max_length=100)]
    | dict[Key, Integer]
    | dict[Key, Text]
)


class HintAvailability(WireModel):
    available: bool
    model: (
        Annotated[str, Field(max_length=100, min_length=1), wire_text_limit(100)] | None
    )


class HintCase(WireModel):
    expected: Value
    id: Annotated[str, Field(pattern=r"^[a-zA-Z0-9@_.:-]{1,100}$")]
    input: Value


class HintChallenge(WireModel):
    function_contract: FunctionContract
    objective: Annotated[str, Field(max_length=500, min_length=1), wire_text_limit(500)]
    public_cases: Annotated[list[HintCase], Field(max_length=12, min_length=1)]
    requirements: Annotated[list[Requirement], Field(max_length=24, min_length=1)]
    statement: Annotated[
        str, Field(max_length=4000, min_length=1), wire_text_limit(4000)
    ]
    technique: Technique
    title: Annotated[str, Field(max_length=200, min_length=1), wire_text_limit(200)]


class HintDraft(WireModel):
    content: Content
    level: Level


class HintInput(WireModel):
    challenge: HintChallenge
    level: Level
    previous_hints: Annotated[list[Content], Field(max_length=2)]
    schema_version: Version


class HintModel(WireModel):
    name: Annotated[str, Field(max_length=100, min_length=1), wire_text_limit(100)]
    prompt_version: Literal["programming-hints-v1"]
    provider: Literal["openai"]
    schema_version: Version


class HintOutput(WireModel):
    hint: HintDraft
    model: HintModel
    schema_version: Version
