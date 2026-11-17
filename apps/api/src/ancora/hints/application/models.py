from dataclasses import dataclass
from typing import Literal

from ancora.hints.domain.models import Hint, HintChallenge


@dataclass(frozen=True)
class HintCommand:
    challenge: HintChallenge
    level: int
    previous_hints: tuple[str, ...]


@dataclass(frozen=True)
class HintProvenance:
    provider: Literal["openai"]
    name: str
    prompt_version: Literal["programming-hints-v1"]


@dataclass(frozen=True)
class HintResult:
    hint: Hint
    model: HintProvenance
