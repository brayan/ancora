from ancora.challenges.domain.models import ExampleCase, FunctionContract, Parameter
from ancora.hints.api import schemas
from ancora.hints.application.models import HintCommand, HintResult
from ancora.hints.domain.models import HintChallenge


def map_application_hint_result_to_http_output(
    result: HintResult,
) -> schemas.HintOutput:
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


def map_http_hint_input_to_application_command(
    payload: schemas.HintInput,
) -> HintCommand:
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
    public_challenge = HintChallenge(
        function_contract=function_contract,
        objective=challenge.objective,
        public_cases=public_cases,
        requirements=requirements,
        statement=challenge.statement,
        technique=challenge.technique,
        title=challenge.title,
    )
    previous_hints = tuple(payload.previous_hints)
    return HintCommand(
        challenge=public_challenge, level=payload.level, previous_hints=previous_hints
    )
