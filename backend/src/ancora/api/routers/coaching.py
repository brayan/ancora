from fastapi import APIRouter

from ancora.api.dependencies.coaching import (
    CoachingProviderDependency,
    GenerateCoachingFeedbackDependency,
)
from ancora.api.mappers.coaching import command_from_request, response_from_result
from ancora.api.responses import TRUSTED_SERVER_RESPONSES
from ancora.api.schemas.coaching import (
    CoachingAvailability,
    CoachingInput,
    CoachingOutput,
)
from ancora.api.schemas.errors import ApiErrorResponse

router = APIRouter(tags=["coaching"])


@router.get(
    "/coaching/status",
    response_model=CoachingAvailability,
    responses=TRUSTED_SERVER_RESPONSES,
    summary="Read coaching availability",
)
async def status(provider: CoachingProviderDependency) -> CoachingAvailability:
    """Read coaching configuration without a provider call or product writes.

    Requires the trusted server token and no Origin header. Availability does not
    establish provider reachability, remaining credit or an available dispatch.
    """
    return CoachingAvailability(available=provider.available, model=provider.model)


@router.post(
    "/coaching",
    response_description="Advisory feedback and provenance; no replacement verdict or solution.",
    response_model=CoachingOutput,
    responses={
        **TRUSTED_SERVER_RESPONSES,
        422: {
            "model": ApiErrorResponse,
            "description": "Invalid coaching input, output or bounded payload.",
            "content": {"application/json": {"example": {"error": "coaching_invalid"}}},
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
            "description": "Coaching is not configured.",
            "content": {
                "application/json": {"example": {"error": "coaching_unavailable"}}
            },
        },
    },
    summary="Generate selected-attempt coaching",
)
async def generate(
    payload: CoachingInput,
    generate_coaching_feedback: GenerateCoachingFeedbackDependency,
) -> CoachingOutput:
    """Make one bounded call for an attempt explicitly shared through Next.js.

    Receives saved source, public challenge context and aggregate execution data.
    Next.js owns sharing confirmation, persistence and dispatch allowance. This
    backend never executes source or changes a verdict. Provider retries are off;
    failures expose bounded codes without source or provider exception details.
    """
    result = await generate_coaching_feedback(command_from_request(payload))
    return response_from_result(result)
