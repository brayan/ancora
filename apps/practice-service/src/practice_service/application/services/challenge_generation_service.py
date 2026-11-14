"""One provider dispatch followed by deterministic challenge acceptance rules."""

from practice_service.application.errors import GenerationUnavailable
from practice_service.application.interfaces.challenge_generation_provider import (
    ChallengeGenerationProvider,
)
from practice_service.application.models import GenerationCommand, GenerationResult
from practice_service.domain.challenges.rules import validate_draft


class ChallengeGenerationService:
    def __init__(self, provider: ChallengeGenerationProvider) -> None:
        self._provider = provider

    async def generate(self, command: GenerationCommand) -> GenerationResult:
        if not self._provider.available:
            raise GenerationUnavailable

        result = await self._provider.generate(command)
        validate_draft(result.draft, command.request)
        if self._provider.model is None:
            raise GenerationUnavailable
        return result
