from dataclasses import replace

import pytest
from ancora.challenges.api.mappers import (
    map_http_challenge_draft_to_domain,
    map_http_generation_input_to_application_command,
)
from ancora.challenges.application.errors import GenerationUnavailable
from ancora.challenges.application.models import (
    GenerationCommand,
    GenerationResult,
    ModelProvenance,
)
from ancora.challenges.application.use_cases.generate_challenge import (
    GenerateChallenge,
)
from ancora.challenges.domain.errors import DraftInvalid
from ancora.shared.application.errors import ProviderInterrupted
from synthetic import draft_for, generation_input


class RecordingProvider:
    available: bool = True
    model: str | None = "synthetic-offline"

    def __init__(
        self,
        result: GenerationResult,
    ) -> None:
        self.result = result
        self.commands: list[GenerationCommand] = []

    async def generate(
        self,
        command: GenerationCommand,
    ) -> GenerationResult:
        self.commands.append(command)
        return self.result


def provider_for_request() -> tuple[RecordingProvider, GenerationCommand]:
    payload = generation_input()
    command = map_http_generation_input_to_application_command(payload)
    result = GenerationResult(
        map_http_challenge_draft_to_domain(draft_for(payload)),
        ModelProvenance("openai", "synthetic-offline", "programming-practice-v1"),
    )
    return RecordingProvider(result), command


@pytest.mark.asyncio
async def test_should_forward_correction_context_once_when_previous_draft_is_supplied() -> (
    None
):
    provider, command = provider_for_request()
    correction = replace(
        command,
        feedback=("reference_failed",),
        previous=provider.result.draft,
        recent_exercises=("Synthetic earlier exercise",),
    )

    generate_challenge = GenerateChallenge(provider)
    await generate_challenge(correction)
    assert provider.commands == [correction]


@pytest.mark.asyncio
async def test_should_preserve_interruption_when_provider_outcome_is_uncertain() -> (
    None
):
    class InterruptedProvider(RecordingProvider):
        async def generate(
            self,
            command: GenerationCommand,
        ) -> GenerationResult:
            self.commands.append(command)
            raise ProviderInterrupted

    original, command = provider_for_request()
    provider = InterruptedProvider(original.result)
    generate_challenge = GenerateChallenge(provider)
    with pytest.raises(ProviderInterrupted):
        await generate_challenge(command)
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
    generate_challenge = GenerateChallenge(provider)

    with pytest.raises(DraftInvalid, match="reference_contract_invalid"):
        await generate_challenge(command)
    assert provider.commands == [command]


@pytest.mark.asyncio
async def test_should_reject_mismatched_challenge_when_provider_returns_other_concept() -> (
    None
):
    provider, command = provider_for_request()
    provider.result = replace(
        provider.result, draft=replace(provider.result.draft, concept="strings")
    )
    generate_challenge = GenerateChallenge(provider)

    with pytest.raises(DraftInvalid, match="request_mismatch"):
        await generate_challenge(command)
    assert provider.commands == [command]


@pytest.mark.asyncio
async def test_should_return_validated_result_when_provider_returns_matching_challenge() -> (
    None
):
    provider, command = provider_for_request()
    generate_challenge = GenerateChallenge(provider)
    result = await generate_challenge(command)

    assert result is provider.result
    assert provider.commands == [command]


@pytest.mark.asyncio
async def test_should_skip_dispatch_when_provider_is_unavailable() -> None:
    provider, command = provider_for_request()
    provider.available = False
    generate_challenge = GenerateChallenge(provider)
    with pytest.raises(GenerationUnavailable):
        await generate_challenge(command)
    assert provider.commands == []
