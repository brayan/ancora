from dataclasses import dataclass

from ancora.domain.challenges.models import ExampleCase, FunctionContract, Technique


@dataclass(frozen=True)
class HintChallenge:
    title: str
    objective: str
    statement: str
    function_contract: FunctionContract
    requirements: tuple[str, ...]
    technique: Technique
    public_cases: tuple[ExampleCase, ...]


@dataclass(frozen=True)
class Hint:
    level: int
    content: str


class HintInvalid(Exception):
    pass
