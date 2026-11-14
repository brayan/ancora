from dataclasses import replace

import pytest
from practice_service.api.mappers.generation import (
    command_from_request,
    draft_to_domain,
)
from practice_service.application.errors import (
    GenerationUnavailable,
    ProviderInterrupted,
)
from practice_service.application.models import (
    GenerationCommand,
    GenerationResult,
    ModelProvenance,
)
from practice_service.application.services.challenge_generation_service import (
    ChallengeGenerationService,
)
from practice_service.domain.challenges.errors import DraftInvalid
from synthetic import draft_for, generation_input


class RecordingProvider:
    available: bool = True
    model: str | None = "synthetic-offline"

    def __init__(self, result: GenerationResult) -> None:
        self.result = result
        self.commands: list[GenerationCommand] = []

    async def generate(self, command: GenerationCommand) -> GenerationResult:
        self.commands.append(command)
        return self.result


def provider_for_request() -> tuple[RecordingProvider, GenerationCommand]:
    payload = generation_input()
    command = command_from_request(payload)
    result = GenerationResult(
        draft_to_domain(draft_for(payload)),
        ModelProvenance("openai", "synthetic-offline", "programming-practice-v1"),
    )
    return RecordingProvider(result), command


@pytest.mark.asyncio
async def test_should_return_validated_result_when_provider_returns_matching_challenge() -> (
    None
):
    provider, command = provider_for_request()
    service = ChallengeGenerationService(provider)
    result = await service.generate(command)

    assert result is provider.result
    assert provider.commands == [command]


@pytest.mark.asyncio
async def test_should_reject_mismatched_challenge_when_provider_returns_other_concept() -> (
    None
):
    provider, command = provider_for_request()
    provider.result = replace(
        provider.result, draft=replace(provider.result.draft, concept="strings")
    )

    with pytest.raises(DraftInvalid, match="request_mismatch"):
        await ChallengeGenerationService(provider).generate(command)
    assert provider.commands == [command]


@pytest.mark.asyncio
async def test_should_reject_invalid_reference_when_provider_returns_contract_mismatch() -> (
    None
):
    provider, command = provider_for_request()
    provider.result = replace(
        provider.result,
        draft=replace(
            provider.result.draft,
            reference_source="def wrong(value: list[int]) -> list[int]:\n    return value\n",
        ),
    )

    with pytest.raises(DraftInvalid, match="reference_contract_invalid"):
        await ChallengeGenerationService(provider).generate(command)
    assert provider.commands == [command]


@pytest.mark.asyncio
async def test_should_skip_dispatch_when_provider_is_unavailable() -> None:
    provider, command = provider_for_request()
    provider.available = False
    with pytest.raises(GenerationUnavailable):
        await ChallengeGenerationService(provider).generate(command)
    assert provider.commands == []


@pytest.mark.asyncio
async def test_should_preserve_interruption_when_provider_outcome_is_uncertain() -> (
    None
):
    class InterruptedProvider(RecordingProvider):
        async def generate(self, command: GenerationCommand) -> GenerationResult:
            self.commands.append(command)
            raise ProviderInterrupted

    original, command = provider_for_request()
    provider = InterruptedProvider(original.result)
    with pytest.raises(ProviderInterrupted):
        await ChallengeGenerationService(provider).generate(command)
    assert provider.commands == [command]


@pytest.mark.asyncio
async def test_should_forward_correction_context_once_when_previous_draft_is_supplied() -> (
    None
):
    provider, command = provider_for_request()
    correction = replace(
        command,
        previous=provider.result.draft,
        feedback=("reference_failed",),
        recent_exercises=("Synthetic earlier exercise",),
    )

    await ChallengeGenerationService(provider).generate(correction)
    assert provider.commands == [correction]
