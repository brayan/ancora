"""Compare exported Zod wire schema to Pydantic without paid model calls."""

import json
from pathlib import Path
from typing import cast

from ancora.challenges.api.schemas import (
    ChallengeDraft,
    GenerationRequest,
    GeneratorInput,
    GeneratorOutput,
)
from ancora.challenges.infrastructure.ai import schemas as provider_schemas
from pydantic import BaseModel
from schema_comparison import normalize


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
