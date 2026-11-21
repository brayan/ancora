"""Translate OpenAI structured data at the infrastructure boundary."""

import json

from ancora.challenges.application.models import GenerationCommand
from ancora.challenges.domain import models
from ancora.challenges.domain.errors import DraftInvalid
from ancora.challenges.domain.values import parse_case_value
from ancora.challenges.infrastructure.ai import schemas


def map_provider_draft_to_challenge_draft(
    draft: schemas.ChallengeDraft,
) -> models.ChallengeDraft:
    _validate_runner_payload(draft)
    contract = draft.function_contract

    def example(case: schemas.GeneratedCase) -> models.ExampleCase:
        case_input = parse_case_value(case.input_json, contract.parameter.type)
        expected = parse_case_value(case.expected_json, contract.returns)
        return models.ExampleCase(expected=expected, id=case.id, input=case_input)

    function_contract = models.FunctionContract(
        name=contract.name,
        parameter=models.Parameter(contract.parameter.name, contract.parameter.type),
        returns=contract.returns,
    )
    requirements = tuple(draft.requirements)
    constraints = tuple(draft.constraints)
    public_cases = tuple(example(case) for case in draft.public_cases)
    check_cases = tuple(example(case) for case in draft.check_cases)
    return models.ChallengeDraft(
        check_cases=check_cases,
        concept=draft.concept,
        constraints=constraints,
        difficulty=draft.difficulty,
        function_contract=function_contract,
        objective=draft.objective,
        public_cases=public_cases,
        reference_source=draft.reference_source,
        requirements=requirements,
        statement=draft.statement,
        technique=draft.technique,
        title=draft.title,
    )


def map_challenge_draft_to_provider_draft(
    draft: models.ChallengeDraft,
) -> schemas.ChallengeDraft:
    contract = draft.function_contract

    def example(case: models.ExampleCase) -> dict[str, str]:
        return {
            "id": case.id,
            "inputJson": json.dumps(
                case.input, ensure_ascii=False, separators=(",", ":")
            ),
            "expectedJson": json.dumps(
                case.expected, ensure_ascii=False, separators=(",", ":")
            ),
        }

    payload = schemas.ChallengeDraft.model_validate(
        {
            "schemaVersion": 1,
            "title": draft.title,
            "concept": draft.concept,
            "difficulty": draft.difficulty,
            "objective": draft.objective,
            "statement": draft.statement,
            "functionContract": {
                "name": contract.name,
                "parameter": {
                    "name": contract.parameter.name,
                    "type": contract.parameter.type,
                },
                "returns": contract.returns,
            },
            "requirements": list(draft.requirements),
            "constraints": list(draft.constraints),
            "technique": draft.technique,
            "publicCases": [example(case) for case in draft.public_cases],
            "checkCases": [example(case) for case in draft.check_cases],
            "referenceSource": draft.reference_source,
        }
    )
    _validate_runner_payload(payload)
    return payload


def map_generation_command_to_generator_input(
    command: GenerationCommand,
) -> schemas.GeneratorInput:
    request = command.request
    return schemas.GeneratorInput.model_validate(
        {
            "schemaVersion": 1,
            "request": {
                "language": request.language,
                "concept": request.concept,
                "difficulty": request.difficulty,
                "goal": request.goal,
                "targetMinutes": request.target_minutes,
                "preferences": request.preferences,
            },
            "previous": map_challenge_draft_to_provider_draft(command.previous)
            if command.previous
            else None,
            "feedback": list(command.feedback),
            "recentExercises": list(command.recent_exercises),
        }
    )


def _validate_runner_payload(draft: schemas.ChallengeDraft) -> None:
    payload = json.dumps(
        {
            "source": draft.reference_source,
            "cases": [
                case.model_dump(by_alias=True)
                for case in draft.public_cases + draft.check_cases
            ],
        },
        ensure_ascii=True,
    ).encode("utf-8")
    if len(payload) > 50_000:
        raise DraftInvalid("runner_payload_too_large")
