import json
from typing import cast

import httpx2
import pytest
from practice_service.generation import ProviderInterrupted
from practice_service.provider import OpenAIChallengeGenerator
from practice_service.validation import DraftInvalid
from synthetic import draft_for, generation_input


def provider_response(
    text: str, *, refusal: bool = False, incomplete: bool = False
) -> dict[str, object]:
    content: dict[str, object] = (
        {"type": "refusal", "refusal": "synthetic refusal"}
        if refusal
        else {
            "type": "output_text",
            "text": text,
            "annotations": [],
        }
    )
    return {
        "id": "resp_synthetic",
        "object": "response",
        "created_at": 0,
        "model": "gpt-4.1",
        "status": "incomplete" if incomplete else "completed",
        "output": [
            {
                "id": "msg_synthetic",
                "type": "message",
                "role": "assistant",
                "status": "completed",
                "content": [content],
            }
        ],
        "usage": {"input_tokens": 10, "output_tokens": 20, "total_tokens": 30},
        "incomplete_details": {"reason": "max_output_tokens"} if incomplete else None,
    }


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

    generator = OpenAIChallengeGenerator(
        "gpt-4.1", "synthetic-key", transport=httpx2.MockTransport(respond)
    )
    try:
        outcome = await generator.generate(request)
    finally:
        await generator.close()

    assert outcome == draft
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
                refusal=response_kind == "refusal",
                incomplete=response_kind == "incomplete",
            ),
        )

    generator = OpenAIChallengeGenerator(
        "gpt-4.1", "synthetic-key", transport=httpx2.MockTransport(respond)
    )
    expected: type[Exception] = (
        ProviderInterrupted
        if response_kind in ("rate_limit", "server_error", "transport_error")
        else DraftInvalid
    )
    try:
        with pytest.raises(expected):
            await generator.generate(generation_input())
    finally:
        await generator.close()
    assert dispatches == 1
