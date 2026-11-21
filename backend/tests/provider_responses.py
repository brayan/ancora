"""Synthetic structured responses shared by the OpenAI provider tests."""


def provider_response(
    text: str,
    *,
    incomplete: bool = False,
    refusal: bool = False,
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
