"""Exercise the Tach graph and preserve the framework-free core guarantee."""

import ast
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

PACKAGE = Path(__file__).resolve().parents[1] / "src/ancora"
ROOT = Path(__file__).resolve().parents[3]


@pytest.fixture
def architecture_project(tmp_path: Path) -> Path:
    # Tach parses imports; it must never import or start the copied service.
    shutil.copytree(PACKAGE, tmp_path / "apps/api/src/ancora")
    shutil.copyfile(ROOT / "tach.toml", tmp_path / "tach.toml")
    return tmp_path


def check_architecture(project: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "tach", "check", "--exact"],
        capture_output=True,
        check=False,
        cwd=project,
        env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
        text=True,
        timeout=30,
    )


def check_domain_imports(project: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            str(Path(sys.executable).with_name("sailtech-check-domain-imports")),
            "--source-root",
            "apps/api/src",
        ],
        capture_output=True,
        check=False,
        cwd=project,
        env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
        text=True,
        timeout=30,
    )


def layer_sources(layer: str) -> list[Path]:
    return sorted(
        path
        for path in PACKAGE.rglob("*.py")
        if layer in path.relative_to(PACKAGE).parts[:-1]
    )


def test_should_accept_domain_when_the_installed_guard_checks_the_service(
    architecture_project: Path,
) -> None:
    outcome = check_domain_imports(architecture_project)

    assert outcome.returncode == 0, outcome.stdout + outcome.stderr


def test_should_accept_graph_when_service_uses_declared_inward_dependencies(
    architecture_project: Path,
) -> None:
    outcome = check_architecture(architecture_project)
    assert outcome.returncode == 0, outcome.stdout + outcome.stderr


def test_should_discover_each_capability_when_nested_core_sources_are_checked() -> None:
    owners = {
        path.relative_to(PACKAGE).parts[0]
        for layer in ("domain", "application")
        for path in layer_sources(layer)
    }

    assert owners == {"challenges", "hints", "coaching", "shared"}


def test_should_import_entire_core_when_site_packages_are_unavailable() -> None:
    modules = [
        ".".join(path.relative_to(PACKAGE.parent).with_suffix("").parts)
        for layer in ("domain", "application")
        for path in layer_sources(layer)
        if path.name != "__init__.py"
    ]
    script = "\n".join(f"import {module}" for module in modules)
    outcome = subprocess.run(
        [sys.executable, "-S", "-c", script],
        capture_output=True,
        check=False,
        env={
            **os.environ,
            "PYTHONPATH": str(PACKAGE.parent),
            "PYTHONDONTWRITEBYTECODE": "1",
        },
        text=True,
        timeout=30,
    )
    assert outcome.returncode == 0, outcome.stderr


def test_should_reject_configuration_when_a_declared_dependency_is_unused(
    architecture_project: Path,
) -> None:
    configuration = architecture_project / "tach.toml"
    configuration.write_text(
        configuration.read_text().replace(
            'path = "ancora.config"\ndepends_on = []',
            'path = "ancora.config"\ndepends_on = ["ancora.challenges.domain"]',
        )
    )
    outcome = check_architecture(architecture_project)
    assert outcome.returncode == 1, outcome.stdout + outcome.stderr
    assert "unused" in (outcome.stdout + outcome.stderr).lower()


def test_should_reject_graph_when_declared_dependencies_form_a_cycle(
    architecture_project: Path,
) -> None:
    configuration = architecture_project / "tach.toml"
    configuration.write_text(
        configuration.read_text().replace(
            'path = "ancora.config"\ndepends_on = []',
            'path = "ancora.config"\ndepends_on = ["ancora.api"]',
        )
    )
    settings = architecture_project / "apps/api/src/ancora/config/settings.py"
    settings.write_text(settings.read_text() + "\nimport ancora.api.app\n")

    outcome = check_architecture(architecture_project)
    assert outcome.returncode == 1, outcome.stdout + outcome.stderr
    assert "circular" in (outcome.stdout + outcome.stderr).lower()


@pytest.mark.parametrize(
    ("source", "forbidden_import"),
    [
        ("challenges/domain/models.py", "import ancora.api.app"),
        ("challenges/domain/models.py", "from ...api import app"),
        (
            "challenges/application/models.py",
            "import ancora.challenges.infrastructure.ai.schemas",
        ),
        ("api/app.py", "import ancora.challenges.infrastructure.ai.schemas"),
        (
            "challenges/infrastructure/ai/schemas.py",
            "import ancora.api.schemas.generation",
        ),
        ("api/app.py", "import ancora.bootstrap"),
        (
            "challenges/infrastructure/ai/schemas.py",
            "import ancora.challenges.application.services.challenge_generation_service",
        ),
        (
            "challenges/application/models.py",
            "from typing import TYPE_CHECKING\nif TYPE_CHECKING:\n    import ancora.api.app",
        ),
        ("hints/domain/rules.py", "from ancora.challenges.domain import rules"),
        ("api/app.py", "from ancora.challenges.domain.rules import validate_draft"),
        (
            "hints/application/services/hint_service.py",
            "import ancora.coaching.application.models",
        ),
        (
            "coaching/infrastructure/ai/schemas.py",
            "import ancora.hints.infrastructure.ai.schemas",
        ),
    ],
    ids=[
        "domain-to-api",
        "relative-domain-to-api",
        "application-to-infrastructure",
        "api-to-infrastructure",
        "infrastructure-to-api",
        "adapter-to-bootstrap",
        "provider-to-service-internals",
        "type-checking-is-coupling",
        "cross-feature-private-rules",
        "api-bypasses-application-service",
        "feature-to-feature-application-internals",
        "feature-to-feature-adapter",
    ],
)
def test_should_reject_import_when_it_crosses_a_forbidden_boundary(
    architecture_project: Path,
    source: str,
    forbidden_import: str,
) -> None:
    path = architecture_project / "apps/api/src/ancora" / source
    path.write_text(path.read_text() + "\n" + forbidden_import + "\n")

    outcome = check_architecture(architecture_project)
    assert outcome.returncode == 1, outcome.stdout + outcome.stderr
    assert source in outcome.stdout + outcome.stderr


def test_should_reject_source_when_it_is_outside_governed_modules(
    architecture_project: Path,
) -> None:
    (architecture_project / "apps/api/src/ungoverned.py").write_text(
        "import ancora.api.app\n"
    )
    outcome = check_architecture(architecture_project)
    assert outcome.returncode == 1, outcome.stdout + outcome.stderr
    assert "ungoverned.py" in outcome.stdout + outcome.stderr


@pytest.mark.parametrize("feature", ["challenges", "hints", "coaching"])
@pytest.mark.parametrize(
    "forbidden_import",
    [
        "import pydantic",
        "from pydantic import BaseModel",
        "from typing import TYPE_CHECKING\nif TYPE_CHECKING:\n    import httpx",
    ],
    ids=["direct", "from-import", "type-checking"],
)
def test_should_reject_third_party_domain_imports_when_the_shared_guard_runs(
    architecture_project: Path,
    feature: str,
    forbidden_import: str,
) -> None:
    domain = architecture_project / f"apps/api/src/ancora/{feature}/domain/models.py"
    domain.write_text(
        domain.read_text()
        + "\n"
        + forbidden_import
        + '\nraise RuntimeError("Scanned source must never execute")\n'
    )

    outcome = check_domain_imports(architecture_project)

    assert outcome.returncode == 1, outcome.stdout + outcome.stderr
    assert (
        f"apps/api/src/ancora/{feature}/domain: domain imports third-party package"
        in (outcome.stdout + outcome.stderr)
    )
    assert "Scanned source must never execute" not in outcome.stdout + outcome.stderr


@pytest.mark.parametrize("layer", ["domain", "application", "api", "infrastructure"])
def test_should_use_absolute_imports_when_service_layers_are_inspected(
    layer: str,
) -> None:
    violations = [
        f"{path.relative_to(PACKAGE)}:{node.lineno}"
        for path in layer_sources(layer)
        for node in ast.walk(ast.parse(path.read_text()))
        if isinstance(node, ast.ImportFrom) and node.level > 0
    ]
    assert violations == []


def test_should_use_only_standard_library_and_core_when_application_imports_are_inspected() -> (
    None
):
    violations: list[str] = []
    for path in layer_sources("application"):
        for node in ast.walk(ast.parse(path.read_text())):
            imports: list[str] = []
            if isinstance(node, ast.Import):
                imports = [alias.name for alias in node.names]
            elif isinstance(node, ast.ImportFrom):
                imports = (
                    [node.module or ""] if node.level == 0 else ["relative-import"]
                )
            else:
                continue

            for name in imports:
                parts = name.split(".")
                core_import = (
                    len(parts) >= 3
                    and parts[0] == "ancora"
                    and parts[1] in {"challenges", "hints", "coaching", "shared"}
                    and parts[2] in {"domain", "application"}
                )
                standard_library = name.split(".")[0] in sys.stdlib_module_names
                if not (core_import or standard_library):
                    violations.append(
                        f"{path.relative_to(PACKAGE)}:{node.lineno}: {name}"
                    )

    assert violations == []
