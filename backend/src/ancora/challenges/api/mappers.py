"""Translate the versioned HTTP representation into application/domain values."""

import json

from ancora.challenges.api import schemas
from ancora.challenges.application.models import GenerationCommand, GenerationResult
from ancora.challenges.domain import models
from ancora.challenges.domain.errors import DraftInvalid
from ancora.challenges.domain.values import parse_case_value


def map_domain_challenge_draft_to_http(
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


def map_generation_result_to_generator_output(
    result: GenerationResult,
) -> schemas.GeneratorOutput:
    return schemas.GeneratorOutput.model_validate(
        {
            "schemaVersion": 1,
            "draft": map_domain_challenge_draft_to_http(result.draft),
            "model": {
                "provider": result.model.provider,
                "name": result.model.name,
                "promptVersion": result.model.prompt_version,
                "schemaVersion": 1,
            },
        }
    )


def map_generator_input_to_generation_command(
    payload: schemas.GeneratorInput,
) -> GenerationCommand:
    request = payload.request
    generation_request = models.GenerationRequest(
        concept=request.concept,
        difficulty=request.difficulty,
        goal=request.goal,
        language=request.language,
        preferences=request.preferences,
        target_minutes=request.target_minutes,
    )
    previous = (
        map_http_challenge_draft_to_domain(payload.previous)
        if payload.previous
        else None
    )
    feedback = tuple(payload.feedback)
    recent_exercises = tuple(payload.recent_exercises)
    return GenerationCommand(
        feedback=feedback,
        previous=previous,
        recent_exercises=recent_exercises,
        request=generation_request,
    )


def map_http_challenge_draft_to_domain(
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
