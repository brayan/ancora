from ancora.challenges.domain.errors import DraftInvalid
from ancora.challenges.domain.values import validate_case_value
from ancora.hints.application.errors import HintsUnavailable
from ancora.hints.application.interfaces.hint_provider import HintProvider
from ancora.hints.application.models import HintCommand, HintResult
from ancora.hints.domain.hint_validation import validate_hint
from ancora.hints.domain.models import Hint, HintInvalid


class GenerateHint:
    def __init__(
        self,
        provider: HintProvider,
    ) -> None:
        self._provider = provider

    async def execute(
        self,
        command: HintCommand,
    ) -> HintResult:
        if not self._provider.available:
            raise HintsUnavailable
        if type(command.level) is not int or not 1 <= command.level <= 3:
            raise HintInvalid
        if len(command.previous_hints) != command.level - 1:
            raise HintInvalid
        for index, content in enumerate(command.previous_hints, start=1):
            validate_hint(Hint(index, content), index)
        try:
            contract = command.challenge.function_contract
            for case in command.challenge.public_cases:
                validate_case_value(case.input, contract.parameter.type)
                validate_case_value(case.expected, contract.returns)
        except DraftInvalid as error:
            raise HintInvalid from error

        result = await self._provider.generate(command)
        validate_hint(result.hint, command.level)
        has_invalid_hint_result = (
            result.hint.content.strip()
            in [text.strip() for text in command.previous_hints]
            or result.model.name != self._provider.model
            or result.model.provider != "openai"
            or result.model.prompt_version != "programming-hints-v1"
        )
        if has_invalid_hint_result:
            raise HintInvalid
        return result
