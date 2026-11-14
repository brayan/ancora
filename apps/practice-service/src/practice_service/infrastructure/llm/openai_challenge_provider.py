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

from practice_service.application.errors import ProviderInterrupted
from practice_service.application.models import (
    GenerationCommand,
    GenerationResult,
    ModelProvenance,
)
from practice_service.domain.challenges.errors import DraftInvalid
from practice_service.infrastructure.llm.mappers import (
    draft_to_domain,
    request_from_command,
)
from practice_service.infrastructure.llm.schemas import ChallengeDraft

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
            transport=transport or httpx2.AsyncHTTPTransport(retries=0),
            trust_env=False,
            timeout=60.0,
        )
        self._client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://api.openai.com/v1",
            max_retries=0,
            http_client=http_client,
            timeout=60.0,
        )
        provider = OpenAIProvider(openai_client=self._client)
        self._agent = Agent(
            OpenAIResponsesModel(model, provider=provider),
            output_type=NativeOutput(ChallengeDraft, strict=True),
            instructions=PROMPT_PATH.read_text(encoding="utf-8"),
            retries={"tools": 0, "output": 0},
            model_settings=OpenAIResponsesModelSettings(
                max_tokens=6000,
                max_retries=0,
                timeout=60.0,
                openai_store=False,
                openai_service_tier="default",
            ),
        )

        self._agent.instrument = False

    async def generate(self, command: GenerationCommand) -> GenerationResult:
        try:
            async with asyncio.timeout(65.0):
                outcome = await self._agent.run(
                    request_from_command(command).model_dump_json(by_alias=True),
                    usage_limits=UsageLimits(request_limit=1, tool_calls_limit=0),
                )
            return GenerationResult(
                draft=draft_to_domain(outcome.output),
                model=ModelProvenance(
                    provider="openai",
                    name=self.model,
                    prompt_version="programming-practice-v1",
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
