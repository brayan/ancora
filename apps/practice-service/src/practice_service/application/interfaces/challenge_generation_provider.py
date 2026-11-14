"""The application-owned dependency fulfilled by an external generation adapter."""

from typing import Protocol

from practice_service.application.models import GenerationCommand, GenerationResult


class ChallengeGenerationProvider(Protocol):
    @property
    def model(self) -> str | None: ...

    @property
    def available(self) -> bool: ...

    async def generate(
        self,
        command: GenerationCommand,
    ) -> GenerationResult: ...
