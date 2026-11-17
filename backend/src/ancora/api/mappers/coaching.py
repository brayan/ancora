from ancora.api.schemas import coaching as schemas
from ancora.challenges.domain.models import ExampleCase, FunctionContract, Parameter
from ancora.coaching.application.models import CoachingCommand, CoachingResult
from ancora.coaching.domain.models import CoachingChallenge, CoachingEvidence


def command_from_request(payload: schemas.CoachingInput) -> CoachingCommand:
    challenge = payload.challenge
    contract = challenge.function_contract
    function_contract = FunctionContract(
        name=contract.name,
        parameter=Parameter(contract.parameter.name, contract.parameter.type),
        returns=contract.returns,
    )
    requirements = tuple(challenge.requirements)
    public_cases = tuple(
        ExampleCase(case.id, case.input, case.expected)
        for case in challenge.public_cases
    )
    public_challenge = CoachingChallenge(
        function_contract=function_contract,
        objective=challenge.objective,
        public_cases=public_cases,
        requirements=requirements,
        statement=challenge.statement,
        technique=challenge.technique,
        title=challenge.title,
    )
    evidence = CoachingEvidence(
        payload.evidence.execution,
        payload.evidence.passed,
        payload.evidence.total,
        payload.evidence.technique,
    )
    return CoachingCommand(
        challenge=public_challenge, evidence=evidence, source=payload.source
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
