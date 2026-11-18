from typing import Protocol

from ancora.coaching.application.models import CoachingCommand, CoachingResult


class CoachingProvider(Protocol):
    @property
    def available(self) -> bool: ...

    @property
    def model(self) -> str | None: ...

    async def generate(
        self,
        command: CoachingCommand,
    ) -> CoachingResult: ...
