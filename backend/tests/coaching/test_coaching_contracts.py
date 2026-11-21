import json
from pathlib import Path
from typing import cast

from ancora.coaching.api.schemas import CoachingFeedback, CoachingInput, CoachingOutput
from ancora.coaching.infrastructure.ai.schemas import (
    CoachingFeedback as ProviderFeedback,
)
from pydantic import BaseModel
from schema_comparison import normalize, normalize_hint_schema


def test_should_match_coaching_wire_artifacts_when_api_and_provider_models_are_exported() -> (
    None
):
    artifact = cast(
        dict[str, object],
        json.loads(
            (
                Path(__file__).resolve().parents[3]
                / "packages/schemas/coaching-v1.schema.json"
            ).read_text()
        ),
    )
    contracts = cast(dict[str, dict[str, object]], artifact["contracts"])
    models: list[tuple[str, type[BaseModel]]] = [
        ("input", CoachingInput),
        ("output", CoachingOutput),
        ("draft", CoachingFeedback),
        ("draft", ProviderFeedback),
    ]
    for name, model in models:
        exported = model.model_json_schema(by_alias=True)
        assert normalize_hint_schema(
            normalize(exported, exported)
        ) == normalize_hint_schema(normalize(contracts[name], contracts[name])), name
