"""Compare exported Zod wire schema to Pydantic without paid model calls."""

import json
from pathlib import Path
from typing import cast

from practice_service.api.schemas.generation import (
    ChallengeDraft,
    GenerationRequest,
    GeneratorInput,
    GeneratorOutput,
)
from practice_service.infrastructure.llm import schemas as provider_schemas
from pydantic import BaseModel


def normalize(
    value: object,
    root: dict[str, object],
) -> object:
    if isinstance(value, list):
        return [normalize(element, root) for element in cast(list[object], value)]
    if not isinstance(value, dict):
        return value
    mapping = cast(dict[str, object], value)
    if "$ref" in mapping:
        definitions = cast(dict[str, object], root["$defs"])
        name = cast(str, mapping["$ref"]).removeprefix("#/$defs/")
        return normalize(definitions[name], root)
    if (
        "const" in mapping
        and type(mapping["const"]) is int
        and mapping.get("type") == "number"
    ):
        mapping = {**mapping, "type": "integer"}
    return {
        key: sorted(cast(list[str], element))
        if key == "required"
        else normalize(element, root)
        for key, element in mapping.items()
        if key not in ("title", "$schema", "$defs")
    }


def test_should_match_canonical_wire_schema_when_contracts_are_exported() -> None:
    path = (
        Path(__file__).resolve().parents[3]
        / "packages/schemas/generation-v1.schema.json"
    )
    artifact = cast(dict[str, object], json.loads(path.read_text()))
    contracts = cast(dict[str, dict[str, object]], artifact["contracts"])
    models: list[tuple[str, type[BaseModel]]] = [
        ("request", GenerationRequest),
        ("draft", ChallengeDraft),
        ("input", GeneratorInput),
        ("output", GeneratorOutput),
        ("request", provider_schemas.GenerationRequest),
        ("draft", provider_schemas.ChallengeDraft),
        ("input", provider_schemas.GeneratorInput),
    ]
    for name, model in models:
        python_schema = model.model_json_schema(by_alias=True)
        assert normalize(python_schema, python_schema) == normalize(
            contracts[name], contracts[name]
        ), name
