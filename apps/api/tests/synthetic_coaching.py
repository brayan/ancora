"""Synthetic saved code and typed provider for offline coaching checks only."""

import asyncio

from ancora.api.schemas.coaching import CoachingInput
from ancora.coaching.application.models import (
    CoachingCommand,
    CoachingProvenance,
    CoachingResult,
)
from ancora.coaching.domain.models import CoachingFeedback
from synthetic import hint_input

FEEDBACK = CoachingFeedback(
    "The selected attempt returns every input element.",
    ("The public contract asks for positive even numbers and a new list.",),
    "Compare the returned list with the first public example and consider a filtering comprehension.",
)
SYNTHETIC_SOURCE = "def positive_even(values):\n    return values\n"


def coaching_input() -> CoachingInput:
    public = hint_input().challenge
    return CoachingInput.model_validate(
        {
            "schemaVersion": 1,
            "challenge": public.model_dump(by_alias=True),
            "source": SYNTHETIC_SOURCE,
            "evidence": {
                "execution": "result",
                "passed": 1,
                "total": 2,
                "technique": "failed",
            },
        }
    )


class SyntheticCoachingProvider:
    available: bool = True
    model: str = "synthetic-offline"

    def __init__(
        self,
        delay_seconds: float = 0.0,
    ) -> None:
        self.calls: list[CoachingCommand] = []
        self.delay_seconds = delay_seconds

    async def generate(
        self,
        command: CoachingCommand,
    ) -> CoachingResult:
        self.calls.append(command)
        if self.delay_seconds:
            await asyncio.sleep(self.delay_seconds)
        return CoachingResult(
            FEEDBACK,
            CoachingProvenance("openai", self.model, "programming-coaching-v1"),
        )
