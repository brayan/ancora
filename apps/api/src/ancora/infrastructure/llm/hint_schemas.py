from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field


def _content_units(value: str) -> str:
    if len(value.encode("utf-16-le", errors="surrogatepass")) // 2 > 1800:
        raise ValueError("hint limit exceeded")
    return value


class HintDraft(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    level: Annotated[int, Field(ge=1, le=3)]
    content: Annotated[
        str,
        Field(min_length=1, max_length=1800, pattern=r"\S"),
        AfterValidator(_content_units),
    ]
