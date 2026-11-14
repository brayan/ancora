import pytest
from ancora.api.schemas.errors import ApiErrorResponse, DraftInvalidResponse
from ancora.bootstrap import create_app
from ancora.settings import Settings
from fastapi.testclient import TestClient
from synthetic import SyntheticChallengeProvider

TOKEN = "synthetic-server-token-32-characters"
HEADERS = {"Authorization": f"Bearer {TOKEN}"}


@pytest.mark.parametrize(
    "path,method,tag,success_model,error_codes",
    [
        (
            "/v1/status",
            "get",
            "status",
            "GenerationStatus",
            {"401", "403", "422", "503"},
        ),
        (
            "/v1/generate",
            "post",
            "generation",
            "GeneratorOutput",
            {"401", "403", "422", "502", "503"},
        ),
    ],
)
def test_should_describe_the_http_contract_when_openapi_is_generated_offline(
    path: str,
    method: str,
    tag: str,
    success_model: str,
    error_codes: set[str],
) -> None:
    provider = SyntheticChallengeProvider()
    app = create_app(Settings(service_token=TOKEN), provider)
    schema = app.openapi()
    operation = schema["paths"][path][method]

    assert schema["info"]["title"] == "Ancora API"
    assert set(schema["paths"]) == {"/v1/generate", "/v1/status"}
    assert operation["summary"]
    assert operation["description"]
    assert operation["tags"] == [tag]
    responses = operation["responses"]
    assert set(responses) == {"200", *error_codes}
    assert (
        responses["200"]["content"]["application/json"]["schema"]["$ref"]
        == f"#/components/schemas/{success_model}"
    )
    for code in error_codes:
        response = responses[code]
        model = DraftInvalidResponse if code == "422" else ApiErrorResponse
        assert response["description"]
        assert (
            response["content"]["application/json"]["schema"]["$ref"]
            == f"#/components/schemas/{model.__name__}"
        )
        model.model_validate(response["content"]["application/json"]["example"])
    assert provider.calls == 0


@pytest.mark.parametrize("path", ["/docs", "/redoc", "/openapi.json"])
def test_should_keep_documentation_routes_disabled_when_router_metadata_is_added(
    path: str,
) -> None:
    provider = SyntheticChallengeProvider()
    with TestClient(create_app(Settings(service_token=TOKEN), provider)) as client:
        response = client.get(path, headers=HEADERS)

    assert response.status_code == 404
    assert provider.calls == 0


def test_should_return_configured_availability_without_dispatch_when_status_is_read() -> (
    None
):
    provider = SyntheticChallengeProvider()
    with TestClient(create_app(Settings(service_token=TOKEN), provider)) as client:
        response = client.get("/v1/status", headers=HEADERS)

    assert response.json() == {"available": True, "model": "synthetic-offline"}
    assert provider.calls == 0


def test_should_return_false_availability_when_generation_is_disabled() -> None:
    with TestClient(create_app(Settings(service_token=TOKEN))) as client:
        response = client.get("/v1/status", headers=HEADERS)

    assert response.status_code == 200
    assert response.json() == {"available": False, "model": None}


def test_should_match_documented_body_limit_error_when_a_status_request_is_oversized() -> (
    None
):
    provider = SyntheticChallengeProvider()
    with TestClient(create_app(Settings(service_token=TOKEN), provider)) as client:
        response = client.request(
            "GET", "/v1/status", headers=HEADERS, content="x" * 200001
        )

    assert response.status_code == 422
    error = DraftInvalidResponse.model_validate(response.json())
    assert error.issues == ["request_too_large"]
    assert provider.calls == 0
