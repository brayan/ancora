import json
from typing import cast

import httpx2
import pytest
from ancora.api.mappers.hints import command_from_request
from ancora.hints.domain.models import HintInvalid
from ancora.hints.infrastructure.ai.openai_hint_provider import OpenAIHintProvider
from ancora.shared.application.errors import ProviderInterrupted
from synthetic import HINT_TEXTS, hint_input
from test_provider import provider_response


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "kind", ["refusal", "incomplete", "invalid", "429", "500", "network"]
)
async def test_should_never_retry_when_hint_transport_or_structured_output_fails(
    kind: str,
) -> None:
    calls = 0

    def respond(request: httpx2.Request) -> httpx2.Response:
        nonlocal calls
        calls += 1
        if kind == "network":
            raise httpx2.ConnectError("synthetic-private-error", request=request)
        if kind in ("429", "500"):
            return httpx2.Response(
                int(kind),
                json={
                    "error": {"message": "synthetic-private-error", "type": "synthetic"}
                },
            )
        return httpx2.Response(
            200,
            json=provider_response(
                "{}", incomplete=kind == "incomplete", refusal=kind == "refusal"
            ),
        )

    provider = OpenAIHintProvider(
        "gpt-6-luna", "synthetic-key", transport=httpx2.MockTransport(respond)
    )
    try:
        with pytest.raises(
            ProviderInterrupted if kind in ("429", "500", "network") else HintInvalid
        ):
            await provider.generate(command_from_request(hint_input()))
    finally:
        await provider.close()
    assert calls == 1


@pytest.mark.asyncio
async def test_should_send_only_public_context_when_dispatching_a_structured_hint() -> (
    None
):
    requests: list[httpx2.Request] = []

    def respond(request: httpx2.Request) -> httpx2.Response:
        requests.append(request)
        return httpx2.Response(
            200,
            json=provider_response(json.dumps({"level": 2, "content": HINT_TEXTS[1]})),
        )

    provider = OpenAIHintProvider(
        "gpt-6-luna", "synthetic-key", transport=httpx2.MockTransport(respond)
    )
    try:
        result = await provider.generate(command_from_request(hint_input(2)))
    finally:
        await provider.close()
    assert result.hint.level == 2 and result.hint.content == HINT_TEXTS[1]
    assert len(requests) == 1
    body = cast(dict[str, object], json.loads(requests[0].content))
    assert body["store"] is False
    assert body.get("tools", []) == []
    assert body["max_output_tokens"] == 1200
    assert "synthetic-key" not in requests[0].content.decode()
    # No source fields exist in the typed command serialized as provider input.
    command = command_from_request(hint_input(2))
    assert not hasattr(command.challenge, "reference_source")
    assert not hasattr(command.challenge, "check_cases")
    assert command.previous_hints == (HINT_TEXTS[0],)
