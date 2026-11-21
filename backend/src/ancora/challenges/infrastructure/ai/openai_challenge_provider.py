"""Only this adapter can call OpenAI; every retry layer is explicitly disabled."""

import asyncio
from pathlib import Path

import httpx2
from openai import APIError, AsyncOpenAI
from pydantic_ai import Agent, NativeOutput
from pydantic_ai.exceptions import (
    AgentRunError,
    UnexpectedModelBehavior,
)
from pydantic_ai.models.openai import OpenAIResponsesModel, OpenAIResponsesModelSettings
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.usage import UsageLimits

from ancora.challenges.application.models import (
    GenerationCommand,
    GenerationResult,
    ModelProvenance,
)
from ancora.challenges.domain.errors import DraftInvalid
from ancora.challenges.infrastructure.ai.mappers import (
    map_generation_command_to_generator_input,
    map_provider_challenge_draft_to_domain,
)
from ancora.challenges.infrastructure.ai.schemas import ChallengeDraft
from ancora.shared.application.errors import ProviderInterrupted

PROMPT_VERSION = "programming-practice-v1"
PROMPT_PATH = (
    Path(__file__).resolve().parents[6]
    / "prompts/programming-practice"
    / f"{PROMPT_VERSION}.md"
)


class OpenAIChallengeProvider:
    available: bool = True

    def __init__(
        self,
        model: str,
        api_key: str,
        *,
        transport: httpx2.AsyncBaseTransport | None = None,
    ) -> None:
        self.model = model
        http_client = httpx2.AsyncClient(
            timeout=60.0,
            transport=transport or httpx2.AsyncHTTPTransport(retries=0),
            trust_env=False,
        )
        self._client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://api.openai.com/v1",
            http_client=http_client,
            max_retries=0,
            timeout=60.0,
        )
        provider = OpenAIProvider(openai_client=self._client)
        response_model = OpenAIResponsesModel(model, provider=provider)
        output_type = NativeOutput(ChallengeDraft, strict=True)
        instructions = PROMPT_PATH.read_text(encoding="utf-8")
        model_settings = OpenAIResponsesModelSettings(
            max_retries=0,
            max_tokens=6000,
            openai_service_tier="default",
            openai_store=False,
            timeout=60.0,
        )
        self._agent = Agent(
            response_model,
            instructions=instructions,
            model_settings=model_settings,
            output_type=output_type,
            retries={"tools": 0, "output": 0},
        )

        self._agent.instrument = False

    async def generate(
        self,
        command: GenerationCommand,
    ) -> GenerationResult:
        try:
            async with asyncio.timeout(65.0):
                outcome = await self._agent.run(
                    map_generation_command_to_generator_input(command).model_dump_json(
                        by_alias=True
                    ),
                    usage_limits=UsageLimits(request_limit=1, tool_calls_limit=0),
                )
            return GenerationResult(
                draft=map_provider_challenge_draft_to_domain(outcome.output),
                model=ModelProvenance(
                    name=self.model,
                    prompt_version="programming-practice-v1",
                    provider="openai",
                ),
            )
        except UnexpectedModelBehavior as error:
            # Includes refusal, incomplete output and exhausted schema validation.
            raise DraftInvalid("provider_output_invalid") from error
        except (APIError, AgentRunError, httpx2.HTTPError, TimeoutError) as error:
            # An uncertain network/provider failure has already spent this dispatch.
            raise ProviderInterrupted from error

    async def close(self) -> None:
        await self._client.close()
