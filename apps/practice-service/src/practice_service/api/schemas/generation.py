"""Version-one wire models mirrored by packages/schemas/src/generation.ts."""

from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, BeforeValidator, ConfigDict, Field
from pydantic.alias_generators import to_camel

from practice_service.domain.challenges.models import (
    Concept,
    Difficulty,
    PythonType,
    Technique,
)


def _strict_version(value: object) -> object:
    if type(value) not in (int, float):
        raise ValueError("schema version must be numeric")
    return value


def _wire_text_limit(maximum: int) -> AfterValidator:
    def validate(value: str) -> str:
        units = len(value.encode("utf-16-le", errors="surrogatepass")) // 2
        if units > maximum:
            raise ValueError("wire string limit exceeded")
        return value

    return AfterValidator(validate)


Version = Annotated[Literal[1], BeforeValidator(_strict_version)]
PythonName = Annotated[str, Field(pattern=r"^(?!__)[A-Za-z_][A-Za-z0-9_]{0,39}$")]
Requirement = Annotated[str, Field(min_length=1, max_length=500), _wire_text_limit(500)]


class WireModel(BaseModel):
    model_config = ConfigDict(
        extra="forbid", strict=True, alias_generator=to_camel, regex_engine="python-re"
    )


class Parameter(WireModel):
    name: PythonName
    type: PythonType


class FunctionContract(WireModel):
    name: PythonName
    parameter: Parameter
    returns: PythonType


class GenerationRequest(WireModel):
    language: Literal["python"]
    concept: Concept
    difficulty: Difficulty
    goal: Annotated[str, Field(min_length=1, max_length=300), _wire_text_limit(300)]
    target_minutes: Annotated[int, Field(ge=5, le=30)]
    preferences: Annotated[str, Field(max_length=300), _wire_text_limit(300)]


class GeneratedCase(WireModel):
    id: Annotated[str, Field(pattern=r"^[A-Za-z0-9_-]{1,40}$")]
    input_json: Annotated[
        str, Field(min_length=1, max_length=6000), _wire_text_limit(6000)
    ]
    expected_json: Annotated[
        str, Field(min_length=1, max_length=6000), _wire_text_limit(6000)
    ]


class ChallengeDraft(WireModel):
    schema_version: Version
    title: Annotated[str, Field(min_length=1, max_length=200), _wire_text_limit(200)]
    concept: Concept
    difficulty: Difficulty
    objective: Annotated[
        str, Field(min_length=1, max_length=500), _wire_text_limit(500)
    ]
    statement: Annotated[
        str, Field(min_length=1, max_length=4000), _wire_text_limit(4000)
    ]
    function_contract: FunctionContract
    requirements: Annotated[list[Requirement], Field(min_length=1, max_length=12)]
    constraints: Annotated[list[Requirement], Field(min_length=1, max_length=10)]
    technique: Technique
    public_cases: Annotated[list[GeneratedCase], Field(min_length=2, max_length=4)]
    check_cases: Annotated[list[GeneratedCase], Field(min_length=3, max_length=8)]
    reference_source: Annotated[
        str, Field(min_length=1, max_length=12000), _wire_text_limit(12000)
    ]


class GeneratorInput(WireModel):
    schema_version: Version
    request: GenerationRequest
    previous: ChallengeDraft | None
    feedback: Annotated[
        list[Annotated[str, Field(max_length=100), _wire_text_limit(100)]],
        Field(max_length=10),
    ]
    recent_exercises: Annotated[
        list[Annotated[str, Field(max_length=200), _wire_text_limit(200)]],
        Field(max_length=5),
    ]


class ModelProvenance(WireModel):
    provider: Literal["openai"]
    name: Annotated[str, Field(min_length=1, max_length=100), _wire_text_limit(100)]
    prompt_version: Literal["programming-practice-v1"]
    schema_version: Version


class GeneratorOutput(WireModel):
    schema_version: Version
    draft: ChallengeDraft
    model: ModelProvenance
