from ancora.challenges.application.errors import GenerationUnavailable
from ancora.challenges.application.models import GenerationCommand, GenerationResult


class UnavailableChallengeProvider:
    available: bool = False
    model: str | None = None

    async def generate(
        self,
        command: GenerationCommand,
    ) -> GenerationResult:
        del command
        raise GenerationUnavailable
