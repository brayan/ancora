from fastapi import APIRouter

from ancora.api.dependencies.generation import GenerateChallengeDependency
from ancora.api.mappers.generation import command_from_request, response_from_result
from ancora.api.responses import TRUSTED_SERVER_RESPONSES
from ancora.api.schemas.errors import ApiErrorResponse, DraftInvalidResponse
from ancora.api.schemas.generation import GeneratorInput, GeneratorOutput

router = APIRouter(tags=["generation"])


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
)
async def generate(
    payload: GeneratorInput,
    use_case: GenerateChallengeDependency,
) -> GeneratorOutput:
    """Generate an initial draft or an explicit correction with a previous draft.

    May make one paid provider request; automatic retries are disabled. The returned
    draft needs isolated browser reference validation before it can become ready.
    This operation neither persists product records nor executes Python solutions.

    Requires the trusted server's bearer token. Requests with an Origin header are
    rejected before parsing. Failures return bounded codes without input/provider text.
    """
    result = await use_case(command_from_request(payload))
    return response_from_result(result)
