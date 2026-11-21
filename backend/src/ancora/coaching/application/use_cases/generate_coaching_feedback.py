from ancora.challenges.domain.errors import DraftInvalid
from ancora.challenges.domain.values import validate_case_value
from ancora.coaching.application.errors import CoachingUnavailable
from ancora.coaching.application.models import CoachingCommand, CoachingResult
from ancora.coaching.application.ports.coaching_provider import CoachingProvider
from ancora.coaching.domain.feedback_validation import validate_feedback
from ancora.coaching.domain.models import CoachingInvalid


class GenerateCoachingFeedback:
    def __init__(
        self,
        provider: CoachingProvider,
    ) -> None:
        self._provider = provider

    async def __call__(
        self,
        command: CoachingCommand,
    ) -> CoachingResult:
        if not self._provider.available:
            raise CoachingUnavailable

        units = len(command.source.encode("utf-16-le", errors="surrogatepass")) // 2
        evidence = command.evidence
        has_invalid_coaching_input = (
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
        )
        if has_invalid_coaching_input:
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
        has_invalid_provenance = (
            result.model.name != self._provider.model
            or result.model.provider != "openai"
            or result.model.prompt_version != "programming-coaching-v1"
        )
        if has_invalid_provenance:
            raise CoachingInvalid
        return result
