from ancora.application.hints import HintCommand, HintResult, HintsUnavailable
from ancora.application.interfaces.hint_provider import HintProvider
from ancora.domain.challenges.errors import DraftInvalid
from ancora.domain.challenges.values import validate_case_value
from ancora.domain.hints.models import Hint, HintInvalid
from ancora.domain.hints.rules import validate_hint


class HintService:
    def __init__(
        self,
        provider: HintProvider,
    ) -> None:
        self._provider = provider

    async def generate(
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
