from fastapi import APIRouter

from ancora.hints.api.dependencies import GenerateHintDependency, HintProviderDependency
from ancora.hints.api.mappers import (
    map_application_hint_result_to_http_output,
    map_http_hint_input_to_application_command,
)
from ancora.hints.api.schemas import HintAvailability, HintInput, HintOutput
from ancora.shared.api.responses import TRUSTED_SERVER_RESPONSES
from ancora.shared.api.schemas import ApiErrorResponse

HINTS_PATH = "/hints"

router = APIRouter(tags=["hints"])


@router.get(
    "/hints/status",
    response_model=HintAvailability,
    responses=TRUSTED_SERVER_RESPONSES,
    summary="Read hint availability",
)
async def status(provider: HintProviderDependency) -> HintAvailability:
    """Read hint configuration without a provider call or product writes.

    Requires the trusted server token and no Origin header. Availability does not
    establish provider reachability, remaining credit or an available dispatch.
    """
    return HintAvailability(available=provider.available, model=provider.model)


@router.post(
    HINTS_PATH,
    response_description="A bounded hint and provider provenance; no verdict or solution.",
    response_model=HintOutput,
    responses={
        **TRUSTED_SERVER_RESPONSES,
        422: {
            "model": ApiErrorResponse,
            "description": "Invalid hint input, output or bounded payload.",
            "content": {"application/json": {"example": {"error": "hint_invalid"}}},
        },
        502: {
            "model": ApiErrorResponse,
            "description": "Uncertain dispatch; no automatic retry.",
            "content": {
                "application/json": {"example": {"error": "provider_interrupted"}}
            },
        },
        503: {
            "model": ApiErrorResponse,
            "description": "Hint generation is not configured.",
            "content": {
                "application/json": {"example": {"error": "hints_unavailable"}}
            },
        },
    },
    summary="Generate one progressive hint",
)
async def generate(
    payload: HintInput,
    generate_hint: GenerateHintDependency,
) -> HintOutput:
    """Make at most one paid dispatch for an explicitly requested hint level.

    Accepts only public challenge context and earlier hints, never learner code,
    reference source or withheld cases. Next.js owns persistence and the shared
    dispatch allowance. No Python solutions execute here and no retries occur.
    Failures expose bounded codes; trusted server authentication precedes parsing.
    """
    return map_application_hint_result_to_http_output(
        await generate_hint(map_http_hint_input_to_application_command(payload))
    )
