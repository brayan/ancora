"""Explicit test-only process; not part of the installed production package."""

import os

import uvicorn
from practice_service.bootstrap import create_app
from practice_service.settings import Settings
from synthetic import SyntheticChallengeProvider


def main() -> None:
    if (
        os.environ.get("ANCORA_SYNTHETIC_DATABASE") != "1"
        or os.environ.get("ANCORA_SYNTHETIC_PROVIDER") != "1"
    ):
        raise RuntimeError(
            "Synthetic service requires both explicit synthetic boundary flags"
        )
    settings = Settings(service_token=os.environ.get("PRACTICE_SERVICE_TOKEN", ""))
    if not settings.authenticated:
        raise RuntimeError(
            "Synthetic service requires a server token of at least 32 characters"
        )
    uvicorn.run(
        create_app(settings, SyntheticChallengeProvider()),
        host="127.0.0.1",
        port=8001,
        access_log=False,
    )


if __name__ == "__main__":
    main()
