from pydantic import BaseModel, ConfigDict


class GenerationStatus(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    available: bool
    model: str | None
