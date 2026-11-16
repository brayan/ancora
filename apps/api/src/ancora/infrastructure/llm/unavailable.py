from ancora.application.coaching import (
    CoachingCommand,
    CoachingResult,
    CoachingUnavailable,
)
from ancora.application.errors import GenerationUnavailable
from ancora.application.hints import HintCommand, HintResult, HintsUnavailable
from ancora.application.models import GenerationCommand, GenerationResult


class UnavailableChallengeProvider:
    model: str | None = None
    available: bool = False

    async def generate(
        self,
        command: GenerationCommand,
    ) -> GenerationResult:
        raise GenerationUnavailable


class UnavailableHintProvider:
    available: bool = False
    model: str | None = None

    async def generate(
        self,
        command: HintCommand,
    ) -> HintResult:
        raise HintsUnavailable


class UnavailableCoachingProvider:
    available: bool = False
    model: str | None = None

    async def generate(
        self,
        command: CoachingCommand,
    ) -> CoachingResult:
        raise CoachingUnavailable
