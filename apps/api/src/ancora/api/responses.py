"""Document pre-parse middleware responses consistently across routers."""

from ancora.api.schemas.errors import ApiErrorResponse, DraftInvalidResponse

TRUSTED_SERVER_RESPONSES: dict[int | str, dict[str, object]] = {
    401: {
        "model": ApiErrorResponse,
        "description": "Missing or incorrect server-only bearer token.",
        "content": {"application/json": {"example": {"error": "unauthorized"}}},
    },
    403: {
        "model": ApiErrorResponse,
        "description": "An Origin header was supplied; browser requests are rejected.",
        "content": {"application/json": {"example": {"error": "origin_forbidden"}}},
    },
    503: {
        "model": ApiErrorResponse,
        "description": "Trusted server access is not configured.",
        "content": {
            "application/json": {"example": {"error": "generation_unavailable"}}
        },
    },
    422: {
        "model": DraftInvalidResponse,
        "description": "Request body exceeds the 200000-byte limit.",
        "content": {
            "application/json": {
                "example": {"error": "draft_invalid", "issues": ["request_too_large"]}
            }
        },
    },
}
