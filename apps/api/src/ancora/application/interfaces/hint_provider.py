from typing import Protocol

from ancora.application.hints import HintCommand, HintResult


class HintProvider(Protocol):
    @property
    def available(self) -> bool: ...

    @property
    def model(self) -> str | None: ...

    async def generate(
        self,
        command: HintCommand,
    ) -> HintResult: ...
