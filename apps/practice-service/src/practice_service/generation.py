"""The service owns one dispatch, while Next.js owns durable correction allowance."""

from typing import Protocol

from practice_service.contracts import ChallengeDraft, GeneratorInput


class ProviderInterrupted(Exception):
    pass


class GenerationUnavailable(Exception):
    pass


class ChallengeGenerator(Protocol):
    @property
    def model(self) -> str | None: ...

    @property
    def available(self) -> bool: ...

    async def generate(self, generation_input: GeneratorInput) -> ChallengeDraft: ...


class UnavailableGenerator:
    model: str | None = None
    available: bool = False

    async def generate(self, generation_input: GeneratorInput) -> ChallengeDraft:
        raise GenerationUnavailable
