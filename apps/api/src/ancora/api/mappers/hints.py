from ancora.api.schemas import hints as schemas
from ancora.application.hints import HintCommand, HintResult
from ancora.domain.challenges.models import ExampleCase, FunctionContract, Parameter
from ancora.domain.hints.models import HintChallenge


def command_from_request(payload: schemas.HintInput) -> HintCommand:
    challenge = payload.challenge
    contract = challenge.function_contract
    return HintCommand(
        challenge=HintChallenge(
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
        level=payload.level,
        previous_hints=tuple(payload.previous_hints),
    )


def response_from_result(result: HintResult) -> schemas.HintOutput:
    return schemas.HintOutput.model_validate(
        {
            "schemaVersion": 1,
            "hint": {"level": result.hint.level, "content": result.hint.content},
            "model": {
                "provider": result.model.provider,
                "name": result.model.name,
                "promptVersion": result.model.prompt_version,
                "schemaVersion": 1,
            },
        }
    )
