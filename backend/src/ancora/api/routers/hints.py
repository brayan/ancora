from fastapi import APIRouter

from ancora.api.dependencies.hints import GenerateHintDependency, HintProviderDependency
from ancora.api.mappers.hints import command_from_request, response_from_result
from ancora.api.responses import TRUSTED_SERVER_RESPONSES
from ancora.api.schemas.errors import ApiErrorResponse
from ancora.api.schemas.hints import HintAvailability, HintInput, HintOutput

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
    "/hints",
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
    use_case: GenerateHintDependency,
) -> HintOutput:
    """Make at most one paid dispatch for an explicitly requested hint level.

    Accepts only public challenge context and earlier hints, never learner code,
    reference source or withheld cases. Next.js owns persistence and the shared
    dispatch allowance. No Python solutions execute here and no retries occur.
    Failures expose bounded codes; trusted server authentication precedes parsing.
    """
    return response_from_result(await use_case.execute(command_from_request(payload)))
