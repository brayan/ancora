from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


def _content_units(value: str) -> str:
    if len(value.encode("utf-16-le", errors="surrogatepass")) // 2 > 900:
        raise ValueError("coaching limit exceeded")
    return value


Content = Annotated[
    str,
    Field(min_length=1, max_length=900, pattern=r"\S"),
    AfterValidator(_content_units),
]


class CoachingFeedback(BaseModel):
    model_config = ConfigDict(
        extra="forbid", strict=True, alias_generator=to_camel, populate_by_name=False
    )

    summary: Content
    observations: Annotated[list[Content], Field(min_length=1, max_length=4)]
    next_step: Content
