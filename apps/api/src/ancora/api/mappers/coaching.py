from ancora.api.schemas import coaching as schemas
from ancora.application.coaching import CoachingCommand, CoachingResult
from ancora.domain.challenges.models import ExampleCase, FunctionContract, Parameter
from ancora.domain.coaching.models import CoachingChallenge, CoachingEvidence


def command_from_request(payload: schemas.CoachingInput) -> CoachingCommand:
    challenge = payload.challenge
    contract = challenge.function_contract
    return CoachingCommand(
        challenge=CoachingChallenge(
            title=challenge.title,
            objective=challenge.objective,
            statement=challenge.statement,
            function_contract=FunctionContract(
                name=contract.name,
                parameter=Parameter(contract.parameter.name, contract.parameter.type),
                returns=contract.returns,
            ),
            requirements=tuple(challenge.requirements),
            technique=challenge.technique,
            public_cases=tuple(
                ExampleCase(case.id, case.input, case.expected)
                for case in challenge.public_cases
            ),
        ),
        source=payload.source,
        evidence=CoachingEvidence(
            payload.evidence.execution,
            payload.evidence.passed,
            payload.evidence.total,
            payload.evidence.technique,
        ),
    )


def response_from_result(result: CoachingResult) -> schemas.CoachingOutput:
    return schemas.CoachingOutput.model_validate(
        {
            "schemaVersion": 1,
            "feedback": {
                "summary": result.feedback.summary,
                "observations": list(result.feedback.observations),
                "nextStep": result.feedback.next_step,
            },
            "model": {
                "provider": result.model.provider,
                "name": result.model.name,
                "promptVersion": result.model.prompt_version,
                "schemaVersion": 1,
            },
        }
    )
