from fastapi import APIRouter

from practice_service.api.dependencies import GenerationService
from practice_service.api.mappers.generation import (
    command_from_request,
    response_from_result,
)
from practice_service.api.schemas.generation import GeneratorInput, GeneratorOutput

router = APIRouter()


@router.post("/generate", response_model=GeneratorOutput)
async def generate(
    payload: GeneratorInput, service: GenerationService
) -> GeneratorOutput:
    result = await service.generate(command_from_request(payload))
    return response_from_result(result)
