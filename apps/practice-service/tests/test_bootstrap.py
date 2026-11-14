from unittest.mock import patch

from fastapi.testclient import TestClient
from practice_service.bootstrap import create_app
from practice_service.settings import Settings
from synthetic import SyntheticChallengeProvider

TOKEN = "synthetic-server-token-32-characters"
HEADERS = {"Authorization": f"Bearer {TOKEN}"}
SETTINGS = Settings(
    service_token=TOKEN,
    enabled=True,
    model="synthetic-offline",
    api_key="synthetic-key",
)


def test_should_close_owned_provider_when_app_shuts_down() -> None:
    class OwnedProvider(SyntheticChallengeProvider):
        closed = False

        async def close(self) -> None:
            self.closed = True

    provider = OwnedProvider()
    with (
        patch(
            "practice_service.bootstrap.OpenAIChallengeProvider", return_value=provider
        ),
        TestClient(create_app(SETTINGS)) as client,
    ):
        response = client.get("/v1/status", headers=HEADERS)
        assert not provider.closed

    assert response.json() == {"available": True, "model": "synthetic-offline"}
    assert provider.closed


def test_should_leave_injected_provider_owned_by_caller_when_app_shuts_down() -> None:
    provider = SyntheticChallengeProvider()
    with (
        patch("practice_service.bootstrap.OpenAIChallengeProvider") as construct,
        TestClient(create_app(SETTINGS, provider)) as client,
    ):
        response = client.get("/v1/status", headers=HEADERS)

    assert response.json() == {"available": True, "model": "synthetic-offline"}
    construct.assert_not_called()
