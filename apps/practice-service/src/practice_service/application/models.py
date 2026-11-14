from dataclasses import dataclass
from typing import Literal

from practice_service.domain.challenges.models import ChallengeDraft, GenerationRequest


@dataclass(frozen=True)
class GenerationCommand:
    request: GenerationRequest
    previous: ChallengeDraft | None
    feedback: tuple[str, ...]
    recent_exercises: tuple[str, ...]


@dataclass(frozen=True)
class ModelProvenance:
    provider: Literal["openai"]
    name: str
    prompt_version: Literal["programming-practice-v1"]


@dataclass(frozen=True)
class GenerationResult:
    draft: ChallengeDraft
    model: ModelProvenance
