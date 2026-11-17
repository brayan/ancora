import asyncio
import json
from dataclasses import asdict
from pathlib import Path

import httpx2
from openai import APIError, AsyncOpenAI
from pydantic_ai import Agent, NativeOutput
from pydantic_ai.exceptions import AgentRunError, UnexpectedModelBehavior
from pydantic_ai.models.openai import OpenAIResponsesModel, OpenAIResponsesModelSettings
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.usage import UsageLimits

from ancora.hints.application.models import HintCommand, HintProvenance, HintResult
from ancora.hints.domain.models import Hint, HintInvalid
from ancora.hints.infrastructure.ai.schemas import HintDraft
from ancora.shared.application.errors import ProviderInterrupted

PROMPT_PATH = (
    Path(__file__).resolve().parents[6]
    / "prompts/programming-practice/programming-hints-v1.md"
)


class OpenAIHintProvider:
    available: bool = True

    def __init__(
        self,
        model: str,
        api_key: str,
        *,
        transport: httpx2.AsyncBaseTransport | None = None,
    ) -> None:
        self.model = model
        self._client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://api.openai.com/v1",
            http_client=httpx2.AsyncClient(
                timeout=60.0,
                transport=transport or httpx2.AsyncHTTPTransport(retries=0),
                trust_env=False,
            ),
            max_retries=0,
            timeout=60.0,
        )
        response_model = OpenAIResponsesModel(
            model, provider=OpenAIProvider(openai_client=self._client)
        )
        output_type = NativeOutput(HintDraft, strict=True)
        instructions = PROMPT_PATH.read_text(encoding="utf-8")
        model_settings = OpenAIResponsesModelSettings(
            max_retries=0,
            max_tokens=1200,
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
        command: HintCommand,
    ) -> HintResult:
        try:
            async with asyncio.timeout(65.0):
                outcome = await self._agent.run(
                    json.dumps(asdict(command), ensure_ascii=True),
                    usage_limits=UsageLimits(request_limit=1, tool_calls_limit=0),
                )
            return HintResult(
                Hint(outcome.output.level, outcome.output.content),
                HintProvenance("openai", self.model, "programming-hints-v1"),
            )
        except UnexpectedModelBehavior as error:
            raise HintInvalid from error
        except (APIError, AgentRunError, httpx2.HTTPError, TimeoutError) as error:
            raise ProviderInterrupted from error

    async def close(self) -> None:
        await self._client.close()
