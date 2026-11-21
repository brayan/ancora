from dataclasses import replace
from unittest.mock import patch

import pytest
from ancora.bootstrap import create_app
from ancora.config.settings import Settings
from ancora.hints.api.mappers import map_http_hint_input_to_application_command
from ancora.hints.application.errors import HintsUnavailable
from ancora.hints.application.models import HintCommand, HintResult
from ancora.hints.application.use_cases.generate_hint import GenerateHint
from ancora.hints.domain.models import Hint, HintInvalid
from fastapi.testclient import TestClient
from synthetic import (
    HINT_TEXTS,
    SyntheticChallengeProvider,
    SyntheticHintProvider,
    hint_input,
)

TOKEN = "synthetic-server-token-32-characters"
HEADERS = {"Authorization": f"Bearer {TOKEN}"}


def test_should_close_owned_hint_adapter_when_independent_hint_configuration_is_enabled() -> (
    None
):
    class OwnedProvider(SyntheticHintProvider):
        closed = False

        async def close(self) -> None:
            self.closed = True

    provider = OwnedProvider()
    settings = Settings(
        api_key="synthetic-key",
        hints_enabled=True,
        model="synthetic-offline",
        service_token=TOKEN,
    )
    with (
        patch("ancora.bootstrap.OpenAIHintProvider", return_value=provider),
        TestClient(create_app(settings)) as client,
    ):
        assert client.get("/v1/hints/status", headers=HEADERS).json()["available"]
        assert not provider.closed
    assert not settings.available and settings.hints_available
    assert provider.closed


@pytest.mark.asyncio
@pytest.mark.parametrize("level", [1, 2, 3])
async def test_should_generate_one_progressive_hint_when_previous_levels_are_supplied(
    level: int,
) -> None:
    provider = SyntheticHintProvider()
    command = map_http_hint_input_to_application_command(hint_input(level))
    generate_hint = GenerateHint(provider)
    result = await generate_hint(command)
    assert result.hint == Hint(level, HINT_TEXTS[level - 1])
    assert provider.calls == [command]
    assert not hasattr(command, "source")
    assert not hasattr(command.challenge, "reference_source")
    assert not hasattr(command.challenge, "check_cases")


def test_should_reject_browser_and_oversized_requests_when_accessing_hint_delivery() -> (
    None
):
    provider = SyntheticHintProvider()
    with TestClient(
        create_app(Settings(service_token=TOKEN), hint_provider=provider)
    ) as client:
        payload = hint_input().model_dump(by_alias=True)
        assert client.post("/v1/hints", json=payload).status_code == 401
        assert (
            client.post(
                "/v1/hints",
                headers={**HEADERS, "Origin": "http://127.0.0.1:3001"},
                json=payload,
            ).status_code
            == 403
        )
        response = client.post("/v1/hints", content="x" * 200001, headers=HEADERS)
    assert response.status_code == 422
    assert response.json() == {"error": "hint_invalid"}
    assert provider.calls == []


@pytest.mark.asyncio
async def test_should_reject_inconsistent_public_values_when_the_function_contract_has_another_type() -> (
    None
):
    provider = SyntheticHintProvider()
    command = map_http_hint_input_to_application_command(hint_input())
    invalid_case = replace(
        command.challenge.public_cases[0], input="synthetic-wrong-type"
    )
    command = replace(
        command, challenge=replace(command.challenge, public_cases=(invalid_case,))
    )
    generate_hint = GenerateHint(provider)
    with pytest.raises(HintInvalid):
        await generate_hint(command)
    assert provider.calls == []


@pytest.mark.parametrize(
    "extra", ["source", "referenceSource", "checkCases", "accountId"]
)
def test_should_reject_private_context_when_unrecognized_fields_are_supplied(
    extra: str,
) -> None:
    provider = SyntheticHintProvider()
    payload = {
        **hint_input().model_dump(by_alias=True),
        extra: "synthetic-private-canary",
    }
    with TestClient(
        create_app(Settings(service_token=TOKEN), hint_provider=provider)
    ) as client:
        response = client.post("/v1/hints", headers=HEADERS, json=payload)
    assert response.status_code == 422
    assert response.json() == {"error": "hint_invalid"}
    assert "synthetic-private-canary" not in response.text
    assert provider.calls == []


def test_should_require_separate_opt_in_when_generation_is_enabled() -> None:
    settings = Settings(
        api_key="synthetic-key",
        enabled=True,
        model="synthetic-offline",
        service_token=TOKEN,
    )
    with patch("ancora.bootstrap.OpenAIHintProvider") as construct:
        app = create_app(settings, provider=SyntheticChallengeProvider())
        with TestClient(app) as client:
            response = client.get("/v1/hints/status", headers=HEADERS)
    assert settings.available and not settings.hints_available
    construct.assert_not_called()
    assert response.json() == {"available": False, "model": None}


def test_should_return_hints_without_generation_configuration_when_fake_is_injected() -> (
    None
):
    provider = SyntheticHintProvider()
    with TestClient(
        create_app(Settings(service_token=TOKEN), hint_provider=provider)
    ) as client:
        status = client.get("/v1/hints/status", headers=HEADERS)
        response = client.post(
            "/v1/hints", headers=HEADERS, json=hint_input().model_dump(by_alias=True)
        )
    assert status.json() == {"available": True, "model": "synthetic-offline"}
    assert response.status_code == 200
    assert response.json()["hint"] == {"level": 1, "content": HINT_TEXTS[0]}
    assert len(provider.calls) == 1


@pytest.mark.asyncio
@pytest.mark.parametrize("level,previous", [(0, ()), (4, ()), (2, ()), (1, ("extra",))])
async def test_should_skip_provider_when_hint_progression_is_invalid(
    level: int,
    previous: tuple[str, ...],
) -> None:
    provider = SyntheticHintProvider()
    command = replace(
        map_http_hint_input_to_application_command(hint_input()),
        level=level,
        previous_hints=previous,
    )
    generate_hint = GenerateHint(provider)
    with pytest.raises(HintInvalid):
        await generate_hint(command)
    assert provider.calls == []


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "text",
    [
        " ",
        "```python\nreturn []\n```",
        "def solve(values):\n    return values",
        "😀" * 901,
    ],
)
async def test_should_withhold_obvious_spoilers_when_provider_returns_invalid_content(
    text: str,
) -> None:
    class SpoilerProvider(SyntheticHintProvider):
        async def generate(
            self,
            command: HintCommand,
        ) -> HintResult:
            result = await super().generate(command)
            return replace(result, hint=Hint(command.level, text))

    provider = SpoilerProvider()
    generate_hint = GenerateHint(provider)
    with pytest.raises(HintInvalid):
        await generate_hint(map_http_hint_input_to_application_command(hint_input()))
    assert len(provider.calls) == 1


@pytest.mark.asyncio
async def test_should_withhold_repeated_or_mismatched_hint_when_provider_does_not_progress() -> (
    None
):
    class RepeatingProvider(SyntheticHintProvider):
        async def generate(
            self,
            command: HintCommand,
        ) -> HintResult:
            result = await super().generate(command)
            return replace(result, hint=Hint(2, HINT_TEXTS[0]))

    provider = RepeatingProvider()
    generate_hint = GenerateHint(provider)
    for level in (1, 2):
        with pytest.raises(HintInvalid):
            await generate_hint(
                map_http_hint_input_to_application_command(hint_input(level))
            )
    provider.available = False
    with pytest.raises(HintsUnavailable):
        await generate_hint(map_http_hint_input_to_application_command(hint_input()))
    assert len(provider.calls) == 2
