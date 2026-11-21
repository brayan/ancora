import json
from pathlib import Path
from typing import cast

from ancora.hints.api.schemas import HintDraft, HintInput, HintOutput
from ancora.hints.infrastructure.ai.schemas import HintDraft as ProviderHintDraft
from pydantic import BaseModel
from schema_comparison import normalize, normalize_hint_schema


def test_should_match_public_hint_wire_schemas_when_api_and_provider_models_are_exported() -> (
    None
):
    path = Path(__file__).resolve().parents[3] / "packages/schemas/hints-v1.schema.json"
    artifact = cast(dict[str, object], json.loads(path.read_text()))
    contracts = cast(dict[str, dict[str, object]], artifact["contracts"])
    models: list[tuple[str, type[BaseModel]]] = [
        ("input", HintInput),
        ("output", HintOutput),
        ("draft", HintDraft),
        ("draft", ProviderHintDraft),
    ]
    for name, model in models:
        exported = model.model_json_schema(by_alias=True)
        assert normalize_hint_schema(
            normalize(exported, exported)
        ) == normalize_hint_schema(normalize(contracts[name], contracts[name])), name
