"""Guard dependency direction without installing architecture tooling."""

import ast
import os
import subprocess
import sys
from pathlib import Path

import pytest

PACKAGE = Path(__file__).resolve().parents[1] / "src/ancora"


@pytest.mark.parametrize("layer", ["domain", "application", "api", "infrastructure"])
def test_should_reject_outward_imports_when_layer_dependencies_are_inspected(
    layer: str,
) -> None:
    allowed = {
        "domain": ("ancora.domain",),
        "application": ("ancora.application", "ancora.domain"),
        "api": (
            "ancora.api",
            "ancora.application",
            "ancora.domain",
            "ancora.settings",
        ),
        "infrastructure": (
            "ancora.infrastructure",
            "ancora.application",
            "ancora.domain",
        ),
    }[layer]
    violations: list[str] = []
    for path in sorted((PACKAGE / layer).rglob("*.py")):
        for node in ast.walk(ast.parse(path.read_text())):
            imports: list[str] = []
            if isinstance(node, ast.Import):
                imports = [alias.name for alias in node.names]
            elif isinstance(node, ast.ImportFrom):
                # Absolute imports make the boundary visible at the import site.
                imports = (
                    [node.module or ""] if node.level == 0 else ["relative-import"]
                )
            else:
                continue

            for name in imports:
                own_package = name == "ancora" or name.startswith("ancora.")
                allowed_internal = any(
                    name == prefix or name.startswith(prefix + ".")
                    for prefix in allowed
                )
                pure_layer = layer in ("domain", "application")
                external_framework = (
                    pure_layer and name.split(".")[0] not in sys.stdlib_module_names
                )
                is_outward_dependency = (
                    (own_package and not allowed_internal)
                    or (not own_package and external_framework)
                    or name == "relative-import"
                )
                if is_outward_dependency:
                    violations.append(
                        f"{path.relative_to(PACKAGE)}:{node.lineno}: {name}"
                    )

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
        env={**os.environ, "PYTHONPATH": str(PACKAGE.parent)},
        capture_output=True,
        text=True,
        check=False,
    )
    assert outcome.returncode == 0, outcome.stderr
