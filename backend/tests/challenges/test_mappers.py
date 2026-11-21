import json
from dataclasses import replace

import pytest
from ancora.challenges.api.mappers import (
    map_domain_challenge_draft_to_http,
    map_generation_result_to_generator_output,
    map_generator_input_to_generation_command,
    map_http_challenge_draft_to_domain,
)
from ancora.challenges.application.models import GenerationResult, ModelProvenance
from ancora.challenges.domain.errors import DraftInvalid
from ancora.challenges.infrastructure.ai import mappers as provider_mappers
from ancora.challenges.infrastructure.ai import schemas as provider_schemas
from synthetic import draft_for, generation_input


def test_should_bound_runner_envelope_when_native_cases_are_encoded_for_http() -> None:
    draft = map_http_challenge_draft_to_domain(draft_for(generation_input("strings")))
    cases = tuple(
        replace(case, expected="😀" * 800, input="😀" * 800)
        for case in draft.public_cases + draft.check_cases
    )
    draft = replace(draft, check_cases=cases[2:], public_cases=cases[:2])
    with pytest.raises(DraftInvalid, match="runner_payload_too_large"):
        map_domain_challenge_draft_to_http(draft)


@pytest.mark.parametrize(
    "concept", ["collections", "comprehensions", "dictionaries", "strings", "functions"]
)
def test_should_preserve_challenge_meaning_when_crossing_both_boundaries(
    concept: str,
) -> None:
    request = generation_input(concept)
    draft = draft_for(request)
    domain_draft = map_http_challenge_draft_to_domain(draft)
    provider_draft = provider_schemas.ChallengeDraft.model_validate(
        draft.model_dump(by_alias=True)
    )

    assert (
        provider_mappers.map_provider_challenge_draft_to_domain(provider_draft)
        == domain_draft
    )
    assert (
        map_http_challenge_draft_to_domain(
            map_domain_challenge_draft_to_http(domain_draft)
        )
        == domain_draft
    )
    assert (
        provider_mappers.map_provider_challenge_draft_to_domain(
            provider_mappers.map_domain_challenge_draft_to_provider(domain_draft)
        )
        == domain_draft
    )
    assert domain_draft.reference_source == draft.reference_source
    assert domain_draft.requirements == tuple(draft.requirements)


def test_should_preserve_correction_context_when_preparing_provider_request() -> None:
    payload = generation_input()
    payload = payload.model_copy(
        update={
            "previous": draft_for(payload),
            "feedback": ["reference_failed"],
            "recent_exercises": ["Earlier synthetic challenge"],
        }
    )
    command = map_generator_input_to_generation_command(payload)
    provider_request = provider_mappers.map_generation_command_to_generator_input(
        command
    )

    assert provider_request.request.model_dump(
        by_alias=True
    ) == payload.request.model_dump(by_alias=True)
    assert provider_request.previous is not None
    assert (
        provider_mappers.map_provider_challenge_draft_to_domain(
            provider_request.previous
        )
        == command.previous
    )
    assert provider_request.feedback == payload.feedback
    assert provider_request.recent_exercises == payload.recent_exercises


def test_should_preserve_unicode_and_dictionary_order_when_cases_are_serialized() -> (
    None
):
    draft = draft_for(generation_input("dictionaries"))
    first = draft.public_cases[1].model_copy(
        update={"input_json": '{"z":2,"á":1}', "expected_json": '{"z":2,"á":1}'}
    )
    draft = draft.model_copy(update={"public_cases": [draft.public_cases[0], first]})
    domain_draft = map_http_challenge_draft_to_domain(draft)
    wire_draft = map_domain_challenge_draft_to_http(domain_draft)

    assert list(json.loads(wire_draft.public_cases[1].input_json)) == ["z", "á"]
    assert list(json.loads(wire_draft.public_cases[1].expected_json)) == ["z", "á"]
    assert map_http_challenge_draft_to_domain(wire_draft) == domain_draft


def test_should_validate_boundary_output_when_application_returns_bad_metadata() -> (
    None
):
    from pydantic import ValidationError

    draft = map_http_challenge_draft_to_domain(draft_for(generation_input()))
    provenance = ModelProvenance(
        "openai", "synthetic-offline", "programming-practice-v1"
    )
    result = GenerationResult(draft, replace(provenance, name=""))
    with pytest.raises(ValidationError):
        map_generation_result_to_generator_output(result)
