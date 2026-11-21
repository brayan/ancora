"""One provider dispatch followed by deterministic challenge acceptance rules."""

from ancora.challenges.application.errors import GenerationUnavailable
from ancora.challenges.application.models import GenerationCommand, GenerationResult
from ancora.challenges.application.ports.challenge_generation_provider import (
    ChallengeGenerationProvider,
)
from ancora.challenges.domain.draft_validation import validate_draft


class GenerateChallenge:
    def __init__(
        self,
        provider: ChallengeGenerationProvider,
    ) -> None:
        self._provider = provider

    async def __call__(
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
