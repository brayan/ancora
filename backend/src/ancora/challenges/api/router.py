from fastapi import APIRouter

from ancora.challenges.api.dependencies import (
    GenerateChallengeDependency,
    GenerationProvider,
)
from ancora.challenges.api.mappers import (
    map_generation_result_to_generator_output,
    map_generator_input_to_generation_command,
)
from ancora.challenges.api.schemas import (
    GenerationStatus,
    GeneratorInput,
    GeneratorOutput,
)
from ancora.shared.api.responses import TRUSTED_SERVER_RESPONSES
from ancora.shared.api.schemas import ApiErrorResponse, DraftInvalidResponse

router = APIRouter()


@router.get(
    "/status",
    response_description="Configured generation availability and the selected model.",
    response_model=GenerationStatus,
    responses=TRUSTED_SERVER_RESPONSES,
    summary="Read generation availability",
    tags=["status"],
)
async def status(provider: GenerationProvider) -> GenerationStatus:
    """Read configuration availability without contacting the provider.

    Availability does not establish provider reachability or remaining credit.
    Disabled generation returns available=false; missing trusted-server configuration
    returns 503. Requires a server-only bearer token and no Origin header.
    """
    return GenerationStatus(available=provider.available, model=provider.model)


@router.post(
    "/generate",
    response_description="Structurally validated draft and provider provenance.",
    response_model=GeneratorOutput,
    responses={
        **TRUSTED_SERVER_RESPONSES,
        503: {
            **TRUSTED_SERVER_RESPONSES[503],
            "description": "Trusted server access or generation is not configured.",
        },
        422: {
            "model": DraftInvalidResponse,
            "description": "Invalid request, draft, case contract or bounded payload.",
            "content": {
                "application/json": {
                    "example": {"error": "draft_invalid", "issues": ["request_invalid"]}
                }
            },
        },
        502: {
            "model": ApiErrorResponse,
            "description": "Uncertain provider dispatch; its allowance is consumed without retry.",
            "content": {
                "application/json": {"example": {"error": "provider_interrupted"}}
            },
        },
    },
    summary="Generate a challenge draft",
    tags=["generation"],
)
async def generate(
    payload: GeneratorInput,
    generate_challenge: GenerateChallengeDependency,
) -> GeneratorOutput:
    """Generate an initial draft or an explicit correction with a previous draft.

    May make one paid provider request; automatic retries are disabled. The returned
    draft needs isolated browser reference validation before it can become ready.
    This operation neither persists product records nor executes Python solutions.

    Requires the trusted server's bearer token. Requests with an Origin header are
    rejected before parsing. Failures return bounded codes without input/provider text.
    """
    result = await generate_challenge(
        map_generator_input_to_generation_command(payload)
    )
    return map_generation_result_to_generator_output(result)
