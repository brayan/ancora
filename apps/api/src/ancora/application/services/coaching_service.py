from ancora.application.coaching import (
    CoachingCommand,
    CoachingResult,
    CoachingUnavailable,
)
from ancora.application.interfaces.coaching_provider import CoachingProvider
from ancora.domain.challenges.errors import DraftInvalid
from ancora.domain.challenges.values import validate_case_value
from ancora.domain.coaching.models import CoachingInvalid
from ancora.domain.coaching.rules import validate_feedback


class CoachingService:
    def __init__(
        self,
        provider: CoachingProvider,
    ) -> None:
        self._provider = provider

    async def generate(
        self,
        command: CoachingCommand,
    ) -> CoachingResult:
        if not self._provider.available:
            raise CoachingUnavailable

        units = len(command.source.encode("utf-16-le", errors="surrogatepass")) // 2
        evidence = command.evidence
        if (
            not command.source.strip()
            or units > 12000
            or type(evidence.passed) is not int
            or type(evidence.total) is not int
            or not 0 <= evidence.passed <= evidence.total <= 12
            or evidence.execution
            not in {
                "result",
                "execution_error",
                "timeout",
                "stopped",
                "output_limit",
                "bootstrap_error",
                "invalid_message",
            }
            or evidence.technique
            not in {"passed", "failed", "inconclusive", "not_required"}
        ):
            raise CoachingInvalid
        try:
            contract = command.challenge.function_contract
            for case in command.challenge.public_cases:
                validate_case_value(case.input, contract.parameter.type)
                validate_case_value(case.expected, contract.returns)
        except DraftInvalid as error:
            raise CoachingInvalid from error

        result = await self._provider.generate(command)
        validate_feedback(result.feedback)
        if (
            result.model.name != self._provider.model
            or result.model.provider != "openai"
            or result.model.prompt_version != "programming-coaching-v1"
        ):
            raise CoachingInvalid
        return result
