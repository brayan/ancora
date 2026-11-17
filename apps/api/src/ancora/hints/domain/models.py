from dataclasses import dataclass

from ancora.challenges.domain.models import ExampleCase, FunctionContract, Technique


@dataclass(frozen=True)
class Hint:
    level: int
    content: str


@dataclass(frozen=True)
class HintChallenge:
    title: str
    objective: str
    statement: str
    function_contract: FunctionContract
    requirements: tuple[str, ...]
    technique: Technique
    public_cases: tuple[ExampleCase, ...]


class HintInvalid(Exception):
    pass
