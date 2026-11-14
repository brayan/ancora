"""Translate the versioned HTTP representation into application/domain values."""

import json

from practice_service.api.schemas import generation as schemas
from practice_service.application.models import GenerationCommand, GenerationResult
from practice_service.domain.challenges import models
from practice_service.domain.challenges.errors import DraftInvalid
from practice_service.domain.challenges.values import parse_case_value


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


def draft_to_domain(draft: schemas.ChallengeDraft) -> models.ChallengeDraft:
    _validate_runner_payload(draft)
    contract = draft.function_contract

    def example(case: schemas.GeneratedCase) -> models.ExampleCase:
        return models.ExampleCase(
            id=case.id,
            input=parse_case_value(case.input_json, contract.parameter.type),
            expected=parse_case_value(case.expected_json, contract.returns),
        )

    return models.ChallengeDraft(
        title=draft.title,
        concept=draft.concept,
        difficulty=draft.difficulty,
        objective=draft.objective,
        statement=draft.statement,
        function_contract=models.FunctionContract(
            name=contract.name,
            parameter=models.Parameter(
                contract.parameter.name, contract.parameter.type
            ),
            returns=contract.returns,
        ),
        requirements=tuple(draft.requirements),
        constraints=tuple(draft.constraints),
        technique=draft.technique,
        public_cases=tuple(example(case) for case in draft.public_cases),
        check_cases=tuple(example(case) for case in draft.check_cases),
        reference_source=draft.reference_source,
    )


def command_from_request(payload: schemas.GeneratorInput) -> GenerationCommand:
    request = payload.request
    return GenerationCommand(
        request=models.GenerationRequest(
            language=request.language,
            concept=request.concept,
            difficulty=request.difficulty,
            goal=request.goal,
            target_minutes=request.target_minutes,
            preferences=request.preferences,
        ),
        previous=draft_to_domain(payload.previous) if payload.previous else None,
        feedback=tuple(payload.feedback),
        recent_exercises=tuple(payload.recent_exercises),
    )


def draft_from_domain(draft: models.ChallengeDraft) -> schemas.ChallengeDraft:
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


def response_from_result(result: GenerationResult) -> schemas.GeneratorOutput:
    return schemas.GeneratorOutput.model_validate(
        {
            "schemaVersion": 1,
            "draft": draft_from_domain(result.draft),
            "model": {
                "provider": result.model.provider,
                "name": result.model.name,
                "promptVersion": result.model.prompt_version,
                "schemaVersion": 1,
            },
        }
    )
