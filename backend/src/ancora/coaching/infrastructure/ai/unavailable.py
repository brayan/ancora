from ancora.coaching.application.errors import CoachingUnavailable
from ancora.coaching.application.models import CoachingCommand, CoachingResult


class UnavailableCoachingProvider:
    available: bool = False
    model: str | None = None

    async def generate(
        self,
        command: CoachingCommand,
    ) -> CoachingResult:
        del command
        raise CoachingUnavailable
