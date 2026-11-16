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


@pytest.mark.parametrize("layer", ["domain", "application"])
def test_should_use_only_standard_library_and_core_when_core_imports_are_inspected(
    layer: str,
) -> None:
    violations: list[str] = []
    for path in sorted((PACKAGE / layer).rglob("*.py")):
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
                core_import = name in (
                    "ancora.domain",
                    "ancora.application",
                ) or name.startswith(("ancora.domain.", "ancora.application."))
                standard_library = name.split(".")[0] in sys.stdlib_module_names
                if not (core_import or standard_library):
                    violations.append(
                        f"{path.relative_to(PACKAGE)}:{node.lineno}: {name}"
                    )

    assert violations == []


@pytest.mark.parametrize("layer", ["domain", "application", "api", "infrastructure"])
def test_should_use_absolute_imports_when_service_layers_are_inspected(
    layer: str,
) -> None:
    violations = [
        f"{path.relative_to(PACKAGE)}:{node.lineno}"
        for path in sorted((PACKAGE / layer).rglob("*.py"))
        for node in ast.walk(ast.parse(path.read_text()))
        if isinstance(node, ast.ImportFrom) and node.level > 0
    ]
    assert violations == []


def test_should_import_entire_core_when_site_packages_are_unavailable() -> None:
    modules = [
        ".".join(path.relative_to(PACKAGE.parent).with_suffix("").parts)
        for layer in ("domain", "application")
        for path in sorted((PACKAGE / layer).rglob("*.py"))
        if path.name != "__init__.py"
    ]
    script = "\n".join(f"import {module}" for module in modules)
    outcome = subprocess.run(
        [sys.executable, "-S", "-c", script],
        env={
            **os.environ,
            "PYTHONPATH": str(PACKAGE.parent),
            "PYTHONDONTWRITEBYTECODE": "1",
        },
        capture_output=True,
        text=True,
        check=False,
        timeout=30,
    )
    assert outcome.returncode == 0, outcome.stderr


@pytest.fixture
def architecture_project(tmp_path: Path) -> Path:
    # Tach parses imports; it must never import or start the copied service.
    shutil.copytree(PACKAGE, tmp_path / "apps/api/src/ancora")
    shutil.copyfile(ROOT / "tach.toml", tmp_path / "tach.toml")
    return tmp_path


def check_architecture(project: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "tach", "check", "--exact"],
        cwd=project,
        env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
        capture_output=True,
        text=True,
        check=False,
        timeout=30,
    )


def test_should_accept_graph_when_service_uses_declared_inward_dependencies(
    architecture_project: Path,
) -> None:
    outcome = check_architecture(architecture_project)
    assert outcome.returncode == 0, outcome.stdout + outcome.stderr


@pytest.mark.parametrize(
    ("source", "forbidden_import"),
    [
        ("domain/challenges/models.py", "import ancora.api.app"),
        ("domain/challenges/models.py", "from ...api import app"),
        ("application/models.py", "import ancora.infrastructure.llm.schemas"),
        ("api/app.py", "import ancora.infrastructure.llm.schemas"),
        ("infrastructure/llm/schemas.py", "import ancora.api.schemas.generation"),
        ("api/app.py", "import ancora.bootstrap"),
        (
            "infrastructure/llm/schemas.py",
            "import ancora.application.services.challenge_generation_service",
        ),
        (
            "application/models.py",
            "from typing import TYPE_CHECKING\nif TYPE_CHECKING:\n    import ancora.api.app",
        ),
        ("domain/hints/rules.py", "from ancora.domain.challenges import rules"),
        ("api/app.py", "from ancora.domain.challenges.rules import validate_draft"),
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


def test_should_reject_configuration_when_a_declared_dependency_is_unused(
    architecture_project: Path,
) -> None:
    configuration = architecture_project / "tach.toml"
    configuration.write_text(
        configuration.read_text().replace(
            'path = "ancora.settings"\ndepends_on = []',
            'path = "ancora.settings"\ndepends_on = ["ancora.domain.challenges"]',
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
            'path = "ancora.settings"\ndepends_on = []',
            'path = "ancora.settings"\ndepends_on = ["ancora.api"]',
        )
    )
    settings = architecture_project / "apps/api/src/ancora/settings.py"
    settings.write_text(settings.read_text() + "\nimport ancora.api.app\n")

    outcome = check_architecture(architecture_project)
    assert outcome.returncode == 1, outcome.stdout + outcome.stderr
    assert "circular" in (outcome.stdout + outcome.stderr).lower()
