from ancora.hints.application.errors import HintsUnavailable
from ancora.hints.application.models import HintCommand, HintResult


class UnavailableHintProvider:
    available: bool = False
    model: str | None = None

    async def generate(
        self,
        command: HintCommand,
    ) -> HintResult:
        del command
        raise HintsUnavailable
