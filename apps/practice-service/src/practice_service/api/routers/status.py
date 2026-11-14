from fastapi import APIRouter

from practice_service.api.dependencies import GenerationProvider
from practice_service.api.schemas.status import GenerationStatus

router = APIRouter()


@router.get("/status", response_model=GenerationStatus)
async def status(provider: GenerationProvider) -> GenerationStatus:
    return GenerationStatus(available=provider.available, model=provider.model)
