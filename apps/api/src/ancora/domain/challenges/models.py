"""Challenge concepts independent of delivery, persistence and provider SDKs."""

from dataclasses import dataclass
from typing import Literal

PythonType = Literal[
    "int", "str", "list[int]", "list[str]", "dict[str,int]", "dict[str,str]"
]
Concept = Literal[
    "collections", "comprehensions", "dictionaries", "strings", "functions"
]
Difficulty = Literal["beginner", "intermediate"]
Technique = Literal["none", "list_comprehension", "dict_comprehension"]
CaseValue = int | str | list[int] | list[str] | dict[str, int] | dict[str, str]


@dataclass(frozen=True)
class Parameter:
    name: str
    type: PythonType


@dataclass(frozen=True)
class FunctionContract:
    name: str
    parameter: Parameter
    returns: PythonType


@dataclass(frozen=True)
class GenerationRequest:
    language: Literal["python"]
    concept: Concept
    difficulty: Difficulty
    goal: str
    target_minutes: int
    preferences: str


@dataclass(frozen=True)
class ExampleCase:
    id: str
    input: CaseValue
    expected: CaseValue


@dataclass(frozen=True)
class ChallengeDraft:
    title: str
    concept: Concept
    difficulty: Difficulty
    objective: str
    statement: str
    function_contract: FunctionContract
    requirements: tuple[str, ...]
    constraints: tuple[str, ...]
    technique: Technique
    public_cases: tuple[ExampleCase, ...]
    check_cases: tuple[ExampleCase, ...]
    reference_source: str
