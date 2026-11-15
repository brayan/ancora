from dataclasses import dataclass
from typing import Literal

from ancora.domain.coaching.models import (
    CoachingChallenge,
    CoachingEvidence,
    CoachingFeedback,
)


@dataclass(frozen=True)
class CoachingCommand:
    challenge: CoachingChallenge
    source: str
    evidence: CoachingEvidence


@dataclass(frozen=True)
class CoachingProvenance:
    provider: Literal["openai"]
    name: str
    prompt_version: Literal["programming-coaching-v1"]


@dataclass(frozen=True)
class CoachingResult:
    feedback: CoachingFeedback
    model: CoachingProvenance


class CoachingUnavailable(Exception):
    pass
