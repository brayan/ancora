"""Explicit server-only configuration. No selected model or provider by default."""

import os
from dataclasses import dataclass
from typing import Self


@dataclass(frozen=True)
class Settings:
    service_token: str = ""
    enabled: bool = False
    model: str | None = None
    api_key: str | None = None

    @property
    def authenticated(self) -> bool:
        return len(self.service_token) >= 32

    @property
    def available(self) -> bool:
        return (
            self.authenticated
            and self.enabled
            and self.api_key is not None
            and bool(self.api_key.strip())
            and self.model is not None
            and 1 <= len(self.model.strip()) <= 100
        )

    @classmethod
    def from_environment(cls) -> Self:
        return cls(
            service_token=os.environ.get("PRACTICE_SERVICE_TOKEN", ""),
            enabled=os.environ.get("PRACTICE_GENERATION_ENABLED") == "1",
            model=os.environ.get("PRACTICE_MODEL"),
            api_key=os.environ.get("OPENAI_API_KEY"),
        )
