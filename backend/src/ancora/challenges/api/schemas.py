"""Version-one wire models mirrored by packages/schemas/src/generation.ts."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from ancora.challenges.domain.models import Concept, Difficulty, PythonType, Technique
from ancora.shared.api.schemas import Version, WireModel, wire_text_limit

PythonName = Annotated[str, Field(pattern=r"^(?!__)[A-Za-z_][A-Za-z0-9_]{0,39}$")]
Requirement = Annotated[str, Field(max_length=500, min_length=1), wire_text_limit(500)]


class GeneratedCase(WireModel):
    expected_json: Annotated[
        str, Field(max_length=6000, min_length=1), wire_text_limit(6000)
    ]
    id: Annotated[str, Field(pattern=r"^[A-Za-z0-9_-]{1,40}$")]
    input_json: Annotated[
        str, Field(max_length=6000, min_length=1), wire_text_limit(6000)
    ]


class GenerationRequest(WireModel):
    concept: Concept
    difficulty: Difficulty
    goal: Annotated[str, Field(max_length=300, min_length=1), wire_text_limit(300)]
    language: Literal["python"]
    preferences: Annotated[str, Field(max_length=300), wire_text_limit(300)]
    target_minutes: Annotated[int, Field(ge=5, le=30)]


class GenerationStatus(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    available: bool
    model: str | None


class ModelProvenance(WireModel):
    name: Annotated[str, Field(max_length=100, min_length=1), wire_text_limit(100)]
    prompt_version: Literal["programming-practice-v1"]
    provider: Literal["openai"]
    schema_version: Version


class Parameter(WireModel):
    name: PythonName
    type: PythonType


class FunctionContract(WireModel):
    name: PythonName
    parameter: Parameter
    returns: PythonType


class ChallengeDraft(WireModel):
    check_cases: Annotated[list[GeneratedCase], Field(max_length=8, min_length=3)]
    concept: Concept
    constraints: Annotated[list[Requirement], Field(max_length=10, min_length=1)]
    difficulty: Difficulty
    function_contract: FunctionContract
    objective: Annotated[str, Field(max_length=500, min_length=1), wire_text_limit(500)]
    public_cases: Annotated[list[GeneratedCase], Field(max_length=4, min_length=2)]
    reference_source: Annotated[
        str, Field(max_length=12000, min_length=1), wire_text_limit(12000)
    ]
    requirements: Annotated[list[Requirement], Field(max_length=12, min_length=1)]
    schema_version: Version
    statement: Annotated[
        str, Field(max_length=4000, min_length=1), wire_text_limit(4000)
    ]
    technique: Technique
    title: Annotated[str, Field(max_length=200, min_length=1), wire_text_limit(200)]


class GeneratorInput(WireModel):
    feedback: Annotated[
        list[Annotated[str, Field(max_length=100), wire_text_limit(100)]],
        Field(max_length=10),
    ]
    previous: ChallengeDraft | None
    recent_exercises: Annotated[
        list[Annotated[str, Field(max_length=200), wire_text_limit(200)]],
        Field(max_length=5),
    ]
    request: GenerationRequest
    schema_version: Version


class GeneratorOutput(WireModel):
    draft: ChallengeDraft
    model: ModelProvenance
    schema_version: Version
