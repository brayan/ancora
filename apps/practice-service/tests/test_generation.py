import pytest
from fastapi.testclient import TestClient
from practice_service.contracts import ChallengeDraft, GeneratorInput, GeneratorOutput
from practice_service.generation import ProviderInterrupted
from practice_service.http import create_app
from practice_service.settings import Settings
from practice_service.validation import DraftInvalid, parse_case_value, validate_draft
from synthetic import SyntheticGenerator, draft_for, generation_input

TOKEN = "synthetic-server-token-32-characters"
SETTINGS = Settings(service_token=TOKEN)
HEADERS = {"Authorization": f"Bearer {TOKEN}"}


@pytest.mark.parametrize(
    "concept", ["collections", "comprehensions", "dictionaries", "strings", "functions"]
)
def test_should_return_varied_typed_drafts_when_generator_is_injected(
    concept: str,
) -> None:
    generator = SyntheticGenerator()
    request = generation_input(concept)
    with TestClient(create_app(SETTINGS, generator)) as client:
        response = client.post(
            "/v1/generate", headers=HEADERS, json=request.model_dump(by_alias=True)
        )

    assert response.status_code == 200
    outcome = GeneratorOutput.model_validate_json(response.content)
    assert outcome.draft.function_contract == draft_for(request).function_contract
    assert generator.calls == 1


def test_should_spend_one_dispatch_when_explicit_correction_is_supplied() -> None:
    generator = SyntheticGenerator()
    request = generation_input()
    corrected = request.model_copy(
        update={"previous": draft_for(request), "feedback": ["reference_failed"]}
    )
    with TestClient(create_app(SETTINGS, generator)) as client:
        response = client.post(
            "/v1/generate", headers=HEADERS, json=corrected.model_dump(by_alias=True)
        )
    assert response.status_code == 200
    assert generator.calls == 1


@pytest.mark.parametrize(
    "headers,status", [({}, 401), ({**HEADERS, "Origin": "http://127.0.0.1:3000"}, 403)]
)
def test_should_reject_untrusted_requests_before_dispatch(
    headers: dict[str, str], status: int
) -> None:
    generator = SyntheticGenerator()
    with TestClient(create_app(SETTINGS, generator)) as client:
        response = client.post(
            "/v1/generate", headers=headers, json={"private": "not-echoed"}
        )
    assert response.status_code == status
    assert "not-echoed" not in response.text
    assert generator.calls == 0


def test_should_hide_sensitive_input_when_schema_is_invalid() -> None:
    generator = SyntheticGenerator()
    with TestClient(create_app(SETTINGS, generator)) as client:
        response = client.post(
            "/v1/generate", headers=HEADERS, json={"private": "not-echoed"}
        )
    assert response.json() == {"error": "draft_invalid", "issues": ["request_invalid"]}
    assert generator.calls == 0


def test_should_report_unavailable_without_selected_provider_configuration() -> None:
    with TestClient(create_app(SETTINGS)) as client:
        status = client.get("/v1/status", headers=HEADERS)
        response = client.post(
            "/v1/generate",
            headers=HEADERS,
            json=generation_input().model_dump(by_alias=True),
        )
    assert status.json() == {"available": False, "model": None}
    assert response.status_code == 503
    assert response.json() == {"error": "generation_unavailable"}


def test_should_consume_uncertain_dispatch_without_retry_when_provider_fails() -> None:
    class InterruptedGenerator(SyntheticGenerator):
        async def generate(self, generation_input: GeneratorInput) -> ChallengeDraft:
            self.calls += 1
            raise ProviderInterrupted("private provider output")

    generator = InterruptedGenerator()
    with TestClient(create_app(SETTINGS, generator)) as client:
        response = client.post(
            "/v1/generate",
            headers=HEADERS,
            json=generation_input().model_dump(by_alias=True),
        )
    assert response.status_code == 502
    assert response.json() == {"error": "provider_interrupted"}
    assert generator.calls == 1


@pytest.mark.parametrize(
    "source,kind",
    [
        ("true", "int"),
        ("1000001", "int"),
        ("NaN", "int"),
        ('{"a":1,"a":2}', "dict[str,int]"),
        ("[true]", "list[int]"),
        ("[[]]", "list[str]"),
    ],
)
def test_should_reject_unsafe_case_values_when_type_or_json_is_invalid(
    source: str, kind: str
) -> None:
    from typing import cast

    from practice_service.contracts import PythonType

    with pytest.raises(DraftInvalid):
        parse_case_value(source, cast(PythonType, kind))


@pytest.mark.parametrize(
    "source,issue",
    [
        (
            "def wrong(value: list[int]) -> list[int]:\n    return value\n",
            "reference_contract_invalid",
        ),
        (
            "import os\ndef copy_values(value: list[int]) -> list[int]:\n    return value\n",
            "reference_contract_invalid",
        ),
        (
            "def copy_values(value: list[int]) -> list[int]:\n    import os\n    return value\n",
            "reference_structure_invalid",
        ),
        (
            "def copy_values(value: list[int]) -> list[int]:\n    return value\n",
            "reference_technique_invalid",
        ),
        ("def unfinished(", "reference_syntax_invalid"),
    ],
)
def test_should_reject_reference_contradictions_without_execution(
    source: str, issue: str
) -> None:
    request = generation_input()
    draft = draft_for(request).model_copy(update={"reference_source": source})
    with pytest.raises(DraftInvalid, match=issue):
        validate_draft(draft, request.request)


def test_should_reject_conflicting_examples_when_same_input_has_different_results() -> (
    None
):
    request = generation_input()
    draft = draft_for(request)
    contradictory = draft.check_cases[0].model_copy(
        update={"input_json": "[]", "expected_json": "[1]"}
    )
    draft = draft.model_copy(
        update={"check_cases": [contradictory, *draft.check_cases[1:]]}
    )
    with pytest.raises(DraftInvalid, match="case_contradiction"):
        validate_draft(draft, request.request)


@pytest.mark.parametrize("value", [True, "1"])
def test_should_reject_noninteger_version_when_literal_matches_numerically(
    value: object,
) -> None:
    from pydantic import ValidationError

    payload = generation_input().model_dump(by_alias=True)
    payload["schemaVersion"] = value
    with pytest.raises(ValidationError):
        GeneratorInput.model_validate(payload)


def test_should_block_oversized_payload_before_provider_dispatch() -> None:
    generator = SyntheticGenerator()
    with TestClient(create_app(SETTINGS, generator)) as client:
        response = client.post("/v1/generate", headers=HEADERS, content="x" * 200001)
    assert response.status_code == 422
    assert response.json() == {
        "error": "draft_invalid",
        "issues": ["request_too_large"],
    }
    assert generator.calls == 0


def test_should_reject_missing_server_token_before_exposing_status() -> None:
    with TestClient(create_app(Settings())) as client:
        response = client.get("/v1/status")
    assert response.status_code == 503
    assert response.json() == {"error": "generation_unavailable"}


@pytest.mark.parametrize(
    "kind,source",
    [
        ("str", '"' + "a" * 2001 + '"'),
        ("list[int]", "[" + ",".join(["0"] * 101) + "]"),
        ("dict[str,str]", '{"a":1}'),
    ],
)
def test_should_reject_case_bounds_when_collection_or_string_exceeds_limit(
    kind: str, source: str
) -> None:
    from typing import cast

    from practice_service.contracts import PythonType

    with pytest.raises(DraftInvalid, match="case_type_invalid"):
        parse_case_value(source, cast(PythonType, kind))


def test_should_reject_missing_empty_boundary_when_examples_only_have_values() -> None:
    request = generation_input()
    draft = draft_for(request)
    first = draft.public_cases[0].model_copy(
        update={"input_json": "[2]", "expected_json": "[2]"}
    )
    draft = draft.model_copy(update={"public_cases": [first, draft.public_cases[1]]})
    with pytest.raises(DraftInvalid, match="boundary_case_missing"):
        validate_draft(draft, request.request)


def test_should_reject_duplicate_ids_when_public_and_check_cases_overlap() -> None:
    request = generation_input()
    draft = draft_for(request)
    first = draft.check_cases[0].model_copy(update={"id": draft.public_cases[0].id})
    draft = draft.model_copy(update={"check_cases": [first, *draft.check_cases[1:]]})
    with pytest.raises(DraftInvalid, match="case_ids_invalid"):
        validate_draft(draft, request.request)


def test_should_use_javascript_string_units_when_case_contains_astral_unicode() -> None:
    import json

    assert parse_case_value(json.dumps("😀" * 1000), "str") == "😀" * 1000
    with pytest.raises(DraftInvalid, match="case_type_invalid"):
        parse_case_value(json.dumps("😀" * 1001), "str")
    with pytest.raises(DraftInvalid, match="case_type_invalid"):
        parse_case_value(json.dumps({"😀" * 1001: "a"}), "dict[str,str]")


def test_should_accept_string_dictionary_when_keys_and_values_obey_bounds() -> None:
    assert parse_case_value('{"label":"value"}', "dict[str,str]") == {"label": "value"}


@pytest.mark.parametrize("key", ["a" * 101, "😀" * 51])
def test_should_reject_dictionary_keys_when_they_exceed_runner_wire_bounds(
    key: str,
) -> None:
    import json

    with pytest.raises(DraftInvalid, match="case_type_invalid"):
        parse_case_value(json.dumps({key: 1}), "dict[str,int]")
    with pytest.raises(DraftInvalid, match="case_type_invalid"):
        parse_case_value(json.dumps({key: "value"}), "dict[str,str]")


@pytest.mark.parametrize("key", ["a" * 100, "😀" * 50])
def test_should_accept_dictionary_keys_when_they_match_runner_wire_bounds(
    key: str,
) -> None:
    import json

    integers = {key: 1}
    strings = {key: "value"}

    assert parse_case_value(json.dumps(integers), "dict[str,int]") == integers
    assert parse_case_value(json.dumps(strings), "dict[str,str]") == strings


def test_should_match_wire_text_limits_when_metadata_uses_supplementary_characters() -> (
    None
):
    from pydantic import ValidationError

    payload = generation_input().model_dump(by_alias=True)
    payload["request"]["goal"] = "😀" * 150
    assert GeneratorInput.model_validate(payload).request.goal == "😀" * 150

    payload["request"]["goal"] += "a"
    with pytest.raises(ValidationError):
        GeneratorInput.model_validate(payload)

    draft = draft_for(generation_input()).model_dump(by_alias=True)
    draft["title"] = "😀" * 100
    assert ChallengeDraft.model_validate(draft).title == "😀" * 100

    draft["title"] += "a"
    with pytest.raises(ValidationError):
        ChallengeDraft.model_validate(draft)


def test_should_reject_oversized_runner_payload_when_individual_cases_fit_bounds() -> (
    None
):
    request = generation_input("strings")
    draft = draft_for(request)
    cases = [
        draft.public_cases[0].model_copy(
            update={
                "id": f"large_{index}",
                "input_json": '"' + "😀" * 800 + '"',
                "expected_json": '"' + "😀" * 800 + '"',
            }
        )
        for index in range(5)
    ]
    draft = draft.model_copy(
        update={"public_cases": cases[:2], "check_cases": cases[2:]}
    )
    with pytest.raises(DraftInvalid, match="runner_payload_too_large"):
        validate_draft(draft, request.request)
