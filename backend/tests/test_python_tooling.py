"""Verify Ancora's installed policy artifact, not the shared implementation's fixtures."""

import hashlib
import importlib.metadata
import json
import subprocess
import sys
import zipfile
from pathlib import Path

import pytest
from pydantic import TypeAdapter

ARTIFACTS = Path(__file__).resolve().parents[2] / "config/quality/python"


@pytest.mark.parametrize(
    "command",
    [
        "sailtech-check-parameters",
        "sailtech-check-conditions",
        "sailtech-check-class-spacing",
        "sailtech-check-ordering",
        "sailtech-check-domain-imports",
    ],
)
def test_should_expose_pinned_version_when_an_installed_policy_command_runs(
    command: str,
) -> None:
    provenance = TypeAdapter(dict[str, str]).validate_python(
        json.loads((ARTIFACTS / "provenance.json").read_text())
    )

    outcome = subprocess.run(
        [str(Path(sys.executable).with_name(command)), "--version"],
        capture_output=True,
        check=False,
        text=True,
        timeout=10,
    )

    assert outcome.returncode == 0, outcome.stdout + outcome.stderr
    assert outcome.stdout.strip().endswith(provenance["version"])


def test_should_match_reviewed_wheel_when_python_policy_is_installed() -> None:
    provenance = TypeAdapter(dict[str, str]).validate_python(
        json.loads((ARTIFACTS / "provenance.json").read_text())
    )
    wheel = ARTIFACTS / provenance["wheel"]
    distribution = importlib.metadata.distribution(provenance["package"])

    assert hashlib.sha256(wheel.read_bytes()).hexdigest() == provenance["sha256"]
    assert distribution.version == provenance["version"]
    with zipfile.ZipFile(wheel) as archive:
        modules = [
            name
            for name in archive.namelist()
            if name.startswith("sailtech_python_checks/") and name.endswith(".py")
        ]
        assert modules
        for name in modules:
            assert distribution.locate_file(name).read_bytes() == archive.read(name)
