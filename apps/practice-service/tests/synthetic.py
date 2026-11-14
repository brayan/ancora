"""Authored synthetic drafts; never imported by the production provider."""

import json
from dataclasses import replace

from practice_service.api.mappers.generation import draft_to_domain
from practice_service.api.schemas.generation import ChallengeDraft, GeneratorInput
from practice_service.application.models import (
    GenerationCommand,
    GenerationResult,
    ModelProvenance,
)
from practice_service.domain.challenges.models import PythonType


def draft_for(generation_input: GeneratorInput) -> ChallengeDraft:
    concept = generation_input.request.concept
    variants: dict[str, tuple[str, PythonType, str, list[object]]] = {
        "strings": ("retain_letters", "str", "return value", ["", "a", "aa", "z", "b"]),
        "functions": (
            "keep_integer",
            "int",
            "return value",
            [0, -1, 1, -1000000, 1000000],
        ),
        "dictionaries": (
            "copy_scores",
            "dict[str,int]",
            "return {key: score for key, score in value.items()}",
            [{}, {"a": 1}, {"b": -1}, {"a": 0}, {"b": 2}],
        ),
        "collections": (
            "copy_values",
            "list[int]",
            "return [number for number in value]",
            [[], [1], [-1], [1, 1], [0, 2]],
        ),
        "comprehensions": (
            "copy_labels",
            "list[str]",
            "return [label for label in value]",
            [[], ["a"], ["a", "a"], [""], ["b", "c"]],
        ),
    }
    name, kind, body, values = variants[concept]
    cases = [
        {
            "id": f"case_{index}",
            "inputJson": json.dumps(value),
            "expectedJson": json.dumps(value),
        }
        for index, value in enumerate(values)
    ]
    technique = (
        "dict_comprehension"
        if kind.startswith("dict")
        else "list_comprehension"
        if kind.startswith("list")
        else "none"
    )
    return ChallengeDraft.model_validate(
        {
            "schemaVersion": 1,
            "title": f"Synthetic {concept} {generation_input.request.difficulty}",
            "concept": concept,
            "difficulty": generation_input.request.difficulty,
            "objective": "Return an unchanged value using a fresh container when applicable.",
            "statement": "Return the input unchanged. Preserve order and duplicates. Do not mutate it.",
            "functionContract": {
                "name": name,
                "parameter": {"name": "value", "type": kind},
                "returns": kind,
            },
            "requirements": [
                "Preserve values, order and duplicates; never mutate the input."
            ],
            "constraints": [
                "Integers have magnitude <=1000000; strings <=2000; containers <=100."
            ],
            "technique": technique,
            "publicCases": cases[:2],
            "checkCases": cases[2:],
            "referenceSource": f"def {name}(value: {kind}) -> {kind}:\n    {body}\n",
        }
    )


def generation_input(concept: str = "collections") -> GeneratorInput:
    return GeneratorInput.model_validate(
        {
            "schemaVersion": 1,
            "request": {
                "language": "python",
                "concept": concept,
                "difficulty": "beginner",
                "goal": "Practice pure functions",
                "targetMinutes": 10,
                "preferences": "",
            },
            "previous": None,
            "feedback": [],
            "recentExercises": [],
        }
    )


class SyntheticChallengeProvider:
    available: bool = True
    model: str = "synthetic-offline"

    def __init__(self) -> None:
        self.calls = 0

    async def generate(self, command: GenerationCommand) -> GenerationResult:
        self.calls += 1
        draft = draft_for(generation_input(command.request.concept))
        if (
            command.request.preferences == "synthetic-invalid-reference"
            and command.request.concept == "strings"
            and command.previous is None
        ):
            draft = draft.model_copy(
                update={
                    "reference_source": 'def retain_letters(value: str) -> str:\n    return ""\n',
                }
            )
        return GenerationResult(
            draft=replace(
                draft_to_domain(draft), difficulty=command.request.difficulty
            ),
            model=ModelProvenance("openai", self.model, "programming-practice-v1"),
        )
