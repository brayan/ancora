import json
from pathlib import Path
from typing import cast

from ancora.api.schemas.hints import HintDraft, HintInput, HintOutput
from ancora.hints.infrastructure.ai.schemas import HintDraft as ProviderHintDraft
from pydantic import BaseModel
from test_contract_drift import normalize


def normalize_hint_schema(value: object) -> object:
    if isinstance(value, list):
        return [normalize_hint_schema(item) for item in cast(list[object], value)]
    if not isinstance(value, dict):
        return value
    mapping = {
        key: normalize_hint_schema(item)
        for key, item in cast(dict[str, object], value).items()
    }
    if "propertyNames" in mapping:
        # JSON object property names are strings even when the schema omits the type.
        names = cast(dict[str, object], mapping["propertyNames"])
        mapping["propertyNames"] = {"type": "string", **names}
    if "anyOf" in mapping:
        branches: list[object] = []
        for branch in cast(list[object], mapping["anyOf"]):
            is_nested_union = isinstance(branch, dict) and set(
                cast(dict[str, object], branch)
            ) == {"anyOf"}
            if is_nested_union:
                nested_union = cast(dict[str, object], branch)
                branches.extend(cast(list[object], nested_union["anyOf"]))
            else:
                branches.append(cast(object, branch))
        mapping["anyOf"] = branches
    return mapping


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
