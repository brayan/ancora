import json
from typing import cast

import httpx2
import pytest
from ancora.challenges.api.mappers import (
    map_generator_input_to_generation_command,
    map_wire_draft_to_challenge_draft,
)
from ancora.challenges.domain.errors import DraftInvalid
from ancora.challenges.infrastructure.ai.openai_challenge_provider import (
    OpenAIChallengeProvider,
)
from ancora.shared.application.errors import ProviderInterrupted
from provider_responses import provider_response
from synthetic import draft_for, generation_input


@pytest.mark.asyncio
async def test_should_dispatch_one_structured_request_when_output_is_valid() -> None:
    requests: list[httpx2.Request] = []
    request = generation_input()
    draft = draft_for(request)

    def respond(incoming: httpx2.Request) -> httpx2.Response:
        requests.append(incoming)
        return httpx2.Response(
            200, json=provider_response(draft.model_dump_json(by_alias=True))
        )

    generator = OpenAIChallengeProvider(
        "gpt-4.1", "synthetic-key", transport=httpx2.MockTransport(respond)
    )
    try:
        outcome = await generator.generate(
            map_generator_input_to_generation_command(request)
        )
    finally:
        await generator.close()

    assert outcome.draft == map_wire_draft_to_challenge_draft(draft)
    assert outcome.model.name == "gpt-4.1"
    assert outcome.model.prompt_version == "programming-practice-v1"
    assert len(requests) == 1
    body = cast(dict[str, object], json.loads(requests[0].content))
    assert body["store"] is False
    assert body.get("tools", []) == []
    structured = cast(dict[str, object], body["text"])
    output_format = cast(dict[str, object], structured["format"])
    assert output_format["strict"] is True
    assert output_format["type"] == "json_schema"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "response_kind",
    [
        "invalid",
        "refusal",
        "incomplete",
        "rate_limit",
        "server_error",
        "transport_error",
    ],
)
async def test_should_never_retry_when_provider_rejects_or_interrupts(
    response_kind: str,
) -> None:
    dispatches = 0

    def respond(incoming: httpx2.Request) -> httpx2.Response:
        nonlocal dispatches
        dispatches += 1
        if response_kind == "transport_error":
            raise httpx2.ConnectError(
                "synthetic network interruption", request=incoming
            )
        if response_kind in ("rate_limit", "server_error"):
            return httpx2.Response(
                429 if response_kind == "rate_limit" else 500,
                json={"error": {"message": "private error", "type": "synthetic"}},
            )
        return httpx2.Response(
            200,
            json=provider_response(
                "{}",
                incomplete=response_kind == "incomplete",
                refusal=response_kind == "refusal",
            ),
        )

    generator = OpenAIChallengeProvider(
        "gpt-4.1", "synthetic-key", transport=httpx2.MockTransport(respond)
    )
    expected: type[Exception] = (
        ProviderInterrupted
        if response_kind in ("rate_limit", "server_error", "transport_error")
        else DraftInvalid
    )
    try:
        with pytest.raises(expected):
            await generator.generate(
                map_generator_input_to_generation_command(generation_input())
            )
    finally:
        await generator.close()
    assert dispatches == 1
