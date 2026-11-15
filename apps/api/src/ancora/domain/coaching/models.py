from dataclasses import dataclass

from ancora.domain.challenges.models import ExampleCase, FunctionContract, Technique


@dataclass(frozen=True)
class CoachingChallenge:
    title: str
    objective: str
    statement: str
    function_contract: FunctionContract
    requirements: tuple[str, ...]
    technique: Technique
    public_cases: tuple[ExampleCase, ...]


@dataclass(frozen=True)
class CoachingEvidence:
    execution: str
    passed: int
    total: int
    technique: str


@dataclass(frozen=True)
class CoachingFeedback:
    summary: str
    observations: tuple[str, ...]
    next_step: str


class CoachingInvalid(Exception):
    pass
