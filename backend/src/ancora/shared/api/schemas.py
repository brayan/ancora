"""Public error shapes shared by the trusted HTTP operations."""

from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, BeforeValidator, ConfigDict, Field
from pydantic.alias_generators import to_camel


def wire_text_limit(maximum: int) -> AfterValidator:
    def validate(value: str) -> str:
        units = len(value.encode("utf-16-le", errors="surrogatepass")) // 2
        if units > maximum:
            raise ValueError("wire string limit exceeded")
        return value

    return AfterValidator(validate)


def _strict_version(value: object) -> object:
    if type(value) not in (int, float):
        raise ValueError("schema version must be numeric")
    return value


Version = Annotated[Literal[1], BeforeValidator(_strict_version)]


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


class WireModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, extra="forbid", regex_engine="python-re", strict=True
    )
