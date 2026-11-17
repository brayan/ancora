"""Version-one wire models mirrored by packages/schemas/src/generation.ts."""

from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, BeforeValidator, ConfigDict, Field
from pydantic.alias_generators import to_camel

from ancora.challenges.domain.models import Concept, Difficulty, PythonType, Technique

PythonName = Annotated[str, Field(pattern=r"^(?!__)[A-Za-z_][A-Za-z0-9_]{0,39}$")]


def wire_text_limit(maximum: int) -> AfterValidator:
    def validate(value: str) -> str:
        units = len(value.encode("utf-16-le", errors="surrogatepass")) // 2
        if units > maximum:
            raise ValueError("wire string limit exceeded")
        return value

    return AfterValidator(validate)


Requirement = Annotated[str, Field(max_length=500, min_length=1), wire_text_limit(500)]


def _strict_version(value: object) -> object:
    if type(value) not in (int, float):
        raise ValueError("schema version must be numeric")
    return value


Version = Annotated[Literal[1], BeforeValidator(_strict_version)]


class WireModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, extra="forbid", regex_engine="python-re", strict=True
    )


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
