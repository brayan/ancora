from fastapi import APIRouter

from ancora.api.dependencies.generation import GenerationProvider
from ancora.api.responses import TRUSTED_SERVER_RESPONSES
from ancora.api.schemas.status import GenerationStatus

router = APIRouter(tags=["status"])


@router.get(
    "/status",
    response_description="Configured generation availability and the selected model.",
    response_model=GenerationStatus,
    responses=TRUSTED_SERVER_RESPONSES,
    summary="Read generation availability",
)
async def status(provider: GenerationProvider) -> GenerationStatus:
    """Read configuration availability without contacting the provider.

    Availability does not establish provider reachability or remaining credit.
    Disabled generation returns available=false; missing trusted-server configuration
    returns 503. Requires a server-only bearer token and no Origin header.
    """
    return GenerationStatus(available=provider.available, model=provider.model)
