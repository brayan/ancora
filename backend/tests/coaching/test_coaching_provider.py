import json
from typing import cast

import httpx2
import pytest
from ancora.coaching.api.mappers import map_http_coaching_input_to_application_command
from ancora.coaching.domain.models import CoachingInvalid
from ancora.coaching.infrastructure.ai.openai_coaching_provider import (
    OpenAICoachingProvider,
)
from ancora.shared.application.errors import ProviderInterrupted
from provider_responses import provider_response
from synthetic_coaching import FEEDBACK, coaching_input


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "kind", ["refusal", "incomplete", "invalid", "429", "500", "network"]
)
async def test_should_never_retry_when_coaching_transport_or_structured_output_fails(
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

    provider = OpenAICoachingProvider(
        "gpt-6-luna", "synthetic-key", transport=httpx2.MockTransport(respond)
    )
    try:
        with pytest.raises(
            ProviderInterrupted
            if kind in ("429", "500", "network")
            else CoachingInvalid
        ):
            await provider.generate(
                map_http_coaching_input_to_application_command(coaching_input())
            )
    finally:
        await provider.close()
    assert calls == 1


@pytest.mark.asyncio
async def test_should_send_only_selected_source_and_public_context_when_dispatching_a_structured_coaching() -> (
    None
):
    requests: list[httpx2.Request] = []

    def respond(request: httpx2.Request) -> httpx2.Response:
        requests.append(request)
        return httpx2.Response(
            200,
            json=provider_response(
                json.dumps(
                    {
                        "summary": FEEDBACK.summary,
                        "observations": list(FEEDBACK.observations),
                        "nextStep": FEEDBACK.next_step,
                    }
                )
            ),
        )

    provider = OpenAICoachingProvider(
        "gpt-6-luna", "synthetic-key", transport=httpx2.MockTransport(respond)
    )
    try:
        result = await provider.generate(
            map_http_coaching_input_to_application_command(coaching_input())
        )
    finally:
        await provider.close()
    assert result.feedback == FEEDBACK
    assert len(requests) == 1
    body = cast(dict[str, object], json.loads(requests[0].content))
    assert body["store"] is False
    assert body.get("tools", []) == []
    assert body["max_output_tokens"] == 2000
    assert "synthetic-key" not in requests[0].content.decode()
    # Only the deliberately shared saved source is present; raw reports are absent.
    command = map_http_coaching_input_to_application_command(coaching_input())
    assert not hasattr(command.challenge, "reference_source")
    assert not hasattr(command.challenge, "check_cases")
    assert command.source == coaching_input().source
    assert not hasattr(command, "report")
