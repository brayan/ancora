"""One provider dispatch followed by deterministic challenge acceptance rules."""

from ancora.application.errors import GenerationUnavailable
from ancora.application.interfaces.challenge_generation_provider import (
    ChallengeGenerationProvider,
)
from ancora.application.models import GenerationCommand, GenerationResult
from ancora.domain.challenges.rules import validate_draft


class ChallengeGenerationService:
    def __init__(
        self,
        provider: ChallengeGenerationProvider,
    ) -> None:
        self._provider = provider

    async def generate(
        self,
        command: GenerationCommand,
    ) -> GenerationResult:
        if not self._provider.available:
            raise GenerationUnavailable

        result = await self._provider.generate(command)
        validate_draft(result.draft, command.request)
        if self._provider.model is None:
            raise GenerationUnavailable
        return result
