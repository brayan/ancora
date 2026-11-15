from dataclasses import replace
from unittest.mock import patch

import pytest
from ancora.api.mappers.coaching import command_from_request
from ancora.application.coaching import (
    CoachingCommand,
    CoachingResult,
    CoachingUnavailable,
)
from ancora.application.services.coaching_service import CoachingService
from ancora.bootstrap import create_app
from ancora.domain.coaching.models import CoachingInvalid
from ancora.settings import Settings
from fastapi.testclient import TestClient
from synthetic_coaching import FEEDBACK, SyntheticCoachingProvider, coaching_input

TOKEN = "synthetic-server-token-32-characters"
HEADERS = {"Authorization": f"Bearer {TOKEN}"}


@pytest.mark.asyncio
async def test_should_generate_feedback_when_one_saved_source_and_public_context_are_supplied() -> (
    None
):
    provider = SyntheticCoachingProvider()
    command = command_from_request(coaching_input())
    result = await CoachingService(provider).generate(command)

    assert result.feedback == FEEDBACK
    assert provider.calls == [command]
    assert command.source == coaching_input().source
    assert not hasattr(command.challenge, "reference_source")
    assert not hasattr(command.challenge, "check_cases")


@pytest.mark.asyncio
@pytest.mark.parametrize("source", [" ", "x" * 12001, "😀" * 6001])
async def test_should_skip_provider_when_source_is_empty_or_exceeds_wire_bounds(
    source: str,
) -> None:
    provider = SyntheticCoachingProvider()
    command = replace(command_from_request(coaching_input()), source=source)
    with pytest.raises(CoachingInvalid):
        await CoachingService(provider).generate(command)
    assert provider.calls == []


@pytest.mark.asyncio
async def test_should_skip_provider_when_aggregate_execution_counts_are_inconsistent() -> (
    None
):
    provider = SyntheticCoachingProvider()
    command = command_from_request(coaching_input())
    for passed, total in [(3, 2), (-1, 2), (1, 13), (True, 2)]:
        with pytest.raises(CoachingInvalid):
            await CoachingService(provider).generate(
                replace(
                    command,
                    evidence=replace(command.evidence, passed=passed, total=total),
                )
            )
    assert provider.calls == []


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "text",
    [" ", "```python\nreturn []\n```", "def solve(values): return values", "😀" * 451],
)
async def test_should_withhold_feedback_when_output_is_blank_oversized_or_a_replacement_function(
    text: str,
) -> None:
    class InvalidProvider(SyntheticCoachingProvider):
        async def generate(
            self,
            command: CoachingCommand,
        ) -> CoachingResult:
            result = await super().generate(command)
            return replace(result, feedback=replace(result.feedback, next_step=text))

    provider = InvalidProvider()
    with pytest.raises(CoachingInvalid):
        await CoachingService(provider).generate(command_from_request(coaching_input()))
    assert len(provider.calls) == 1


def test_should_return_coaching_without_generation_or_hints_when_typed_provider_is_injected() -> (
    None
):
    provider = SyntheticCoachingProvider()
    with TestClient(
        create_app(Settings(service_token=TOKEN), coaching_provider=provider)
    ) as client:
        status = client.get("/v1/coaching/status", headers=HEADERS)
        response = client.post(
            "/v1/coaching",
            headers=HEADERS,
            json=coaching_input().model_dump(by_alias=True),
        )

    assert status.json() == {"available": True, "model": "synthetic-offline"}
    assert response.status_code == 200
    assert response.json()["feedback"]["summary"] == FEEDBACK.summary
    assert len(provider.calls) == 1


@pytest.mark.parametrize(
    "extra", ["draft", "referenceSource", "checkCases", "accountId", "report"]
)
def test_should_reject_unrecognized_context_without_echoing_source_when_http_input_is_invalid(
    extra: str,
) -> None:
    provider = SyntheticCoachingProvider()
    payload = {
        **coaching_input().model_dump(by_alias=True),
        extra: "synthetic-private-canary",
    }
    with TestClient(
        create_app(Settings(service_token=TOKEN), coaching_provider=provider)
    ) as client:
        response = client.post("/v1/coaching", headers=HEADERS, json=payload)

    assert response.status_code == 422
    assert response.json() == {"error": "coaching_invalid"}
    assert "synthetic-private-canary" not in response.text
    assert provider.calls == []


def test_should_block_browser_unauthorized_and_oversized_requests_when_coaching_delivery_is_accessed() -> (
    None
):
    provider = SyntheticCoachingProvider()
    with TestClient(
        create_app(Settings(service_token=TOKEN), coaching_provider=provider)
    ) as client:
        payload = coaching_input().model_dump(by_alias=True)
        assert client.post("/v1/coaching", json=payload).status_code == 401
        assert (
            client.post(
                "/v1/coaching",
                headers={**HEADERS, "Origin": "http://127.0.0.1:3001"},
                json=payload,
            ).status_code
            == 403
        )
        response = client.post("/v1/coaching", headers=HEADERS, content="x" * 200001)
    assert response.status_code == 422
    assert response.json() == {"error": "coaching_invalid"}
    assert provider.calls == []


def test_should_require_separate_opt_in_when_only_other_capabilities_are_enabled() -> (
    None
):
    settings = Settings(
        service_token=TOKEN,
        enabled=True,
        hints_enabled=True,
        model="synthetic-offline",
        api_key="synthetic-key",
    )
    assert (
        settings.available
        and settings.hints_available
        and not settings.coaching_available
    )
    with patch("ancora.bootstrap.OpenAICoachingProvider") as construct:
        # Disabled providers have no network side effects during construction/status.
        app = create_app(Settings(service_token=TOKEN))
        with TestClient(app) as client:
            response = client.get("/v1/coaching/status", headers=HEADERS)
    construct.assert_not_called()
    assert response.json() == {"available": False, "model": None}


def test_should_close_owned_coaching_adapter_when_independent_configuration_is_enabled() -> (
    None
):
    class OwnedProvider(SyntheticCoachingProvider):
        closed = False

        async def close(self) -> None:
            self.closed = True

    provider = OwnedProvider()
    settings = Settings(
        service_token=TOKEN,
        coaching_enabled=True,
        model="synthetic-offline",
        api_key="synthetic-key",
    )
    with (
        patch("ancora.bootstrap.OpenAICoachingProvider", return_value=provider),
        TestClient(create_app(settings)) as client,
    ):
        assert client.get("/v1/coaching/status", headers=HEADERS).json()["available"]
        assert not provider.closed
    assert provider.closed
    assert not settings.available and not settings.hints_available


@pytest.mark.asyncio
async def test_should_reject_unknown_provenance_and_disabled_configuration_when_accepting_provider_results() -> (
    None
):
    class WrongProvider(SyntheticCoachingProvider):
        async def generate(
            self,
            command: CoachingCommand,
        ) -> CoachingResult:
            result = await super().generate(command)
            return replace(result, model=replace(result.model, name="different-model"))

    provider = WrongProvider()
    with pytest.raises(CoachingInvalid):
        await CoachingService(provider).generate(command_from_request(coaching_input()))
    provider.available = False
    with pytest.raises(CoachingUnavailable):
        await CoachingService(provider).generate(command_from_request(coaching_input()))
    assert len(provider.calls) == 1
