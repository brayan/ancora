from practice_service.application.errors import GenerationUnavailable
from practice_service.application.models import GenerationCommand, GenerationResult


class UnavailableChallengeProvider:
    model: str | None = None
    available: bool = False

    async def generate(
        self,
        command: GenerationCommand,
    ) -> GenerationResult:
        raise GenerationUnavailable
