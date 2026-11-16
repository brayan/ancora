"""Explicit test-only process; not part of the installed production package."""

import os

import uvicorn
from ancora.bootstrap import create_app
from ancora.settings import Settings
from synthetic import SyntheticChallengeProvider, SyntheticHintProvider
from synthetic_coaching import SyntheticCoachingProvider


def main() -> None:
    is_synthetic_boundary_missing = (
        os.environ.get("ANCORA_SYNTHETIC_DATABASE") != "1"
        or os.environ.get("ANCORA_SYNTHETIC_PROVIDER") != "1"
    )
    if is_synthetic_boundary_missing:
        raise RuntimeError(
            "Synthetic service requires both explicit synthetic boundary flags"
        )
    settings = Settings(service_token=os.environ.get("PRACTICE_SERVICE_TOKEN", ""))
    if not settings.authenticated:
        raise RuntimeError(
            "Synthetic service requires a server token of at least 32 characters"
        )
    uvicorn.run(
        create_app(
            settings,
            SyntheticChallengeProvider(),
            SyntheticHintProvider(delay_seconds=2.0),
            SyntheticCoachingProvider(delay_seconds=2.0),
        ),
        host="127.0.0.1",
        port=8001,
        access_log=False,
    )


if __name__ == "__main__":
    main()
