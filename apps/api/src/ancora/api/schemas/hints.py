from typing import Annotated, Literal

from pydantic import Field

from ancora.api.schemas.generation import (
    FunctionContract,
    Requirement,
    Version,
    WireModel,
    wire_text_limit,
)
from ancora.domain.challenges.models import Technique

Level = Annotated[int, Field(ge=1, le=3)]
Content = Annotated[
    str, Field(min_length=1, max_length=1800, pattern=r"\S"), wire_text_limit(1800)
]
Integer = Annotated[int, Field(ge=-1_000_000, le=1_000_000)]
Text = Annotated[str, Field(max_length=2000), wire_text_limit(2000)]
Key = Annotated[str, Field(max_length=100), wire_text_limit(100)]
Value = (
    Integer
    | Text
    | Annotated[list[Integer], Field(max_length=1000)]
    | Annotated[list[Text], Field(max_length=100)]
    | dict[Key, Integer]
    | dict[Key, Text]
)


class HintCase(WireModel):
    id: Annotated[str, Field(pattern=r"^[a-zA-Z0-9@_.:-]{1,100}$")]
    input: Value
    expected: Value


class HintChallenge(WireModel):
    title: Annotated[str, Field(min_length=1, max_length=200), wire_text_limit(200)]
    objective: Annotated[str, Field(min_length=1, max_length=500), wire_text_limit(500)]
    statement: Annotated[
        str, Field(min_length=1, max_length=4000), wire_text_limit(4000)
    ]
    requirements: Annotated[list[Requirement], Field(min_length=1, max_length=24)]
    function_contract: FunctionContract
    technique: Technique
    public_cases: Annotated[list[HintCase], Field(min_length=1, max_length=12)]


class HintInput(WireModel):
    schema_version: Version
    level: Level
    challenge: HintChallenge
    previous_hints: Annotated[list[Content], Field(max_length=2)]


class HintDraft(WireModel):
    level: Level
    content: Content


class HintModel(WireModel):
    provider: Literal["openai"]
    name: Annotated[str, Field(min_length=1, max_length=100), wire_text_limit(100)]
    prompt_version: Literal["programming-hints-v1"]
    schema_version: Version


class HintOutput(WireModel):
    schema_version: Version
    hint: HintDraft
    model: HintModel


class HintAvailability(WireModel):
    available: bool
    model: (
        Annotated[str, Field(min_length=1, max_length=100), wire_text_limit(100)] | None
    )
