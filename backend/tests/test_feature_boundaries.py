"""Validate published symbols, layer direction and cycles at two granularities."""

import json
import subprocess
import sys
from graphlib import CycleError, TopologicalSorter
from pathlib import Path
from typing import cast

import pytest
from tach.extension import check, format_diagnostics, parse_project_config

LAYER_DEPENDENCIES = {
    "api": {"api", "application", "domain"},
    "application": {"application", "domain"},
    "domain": {"domain"},
    "infrastructure": {"application", "domain", "infrastructure"},
}
PROJECT = Path(__file__).resolve().parents[2]
SOURCE = Path("backend/src/ancora")


def check_edge(
    importer: Path,
    dependency: Path,
) -> None:
    if importer == Path("bootstrap.py"):
        return

    owner = importer.parts[0]
    provider = dependency.parts[0]
    edge = f"{importer} -> {dependency}"
    if owner == "shared":
        assert provider == "shared", f"Shared code depends on a feature: {edge}"
    assert len(importer.parts) >= 3 and len(dependency.parts) >= 3, (
        f"Dependency outside a layer: {edge}"
    )

    source_layer = importer.parts[1]
    target_layer = dependency.parts[1]
    if target_layer == "infrastructure" and provider != "shared":
        assert owner == provider, f"Private feature infrastructure: {edge}"
    assert target_layer in LAYER_DEPENDENCIES[source_layer], f"Layer violation: {edge}"


def check_import_graph(project: Path) -> None:
    result = subprocess.run(
        [sys.executable, "-m", "tach", "map"],
        capture_output=True,
        check=True,
        cwd=project,
        text=True,
        timeout=30,
    )
    imports = cast(dict[str, list[str]], json.loads(result.stdout))
    assert imports, "Tach returned no first-party imports"

    files = TopologicalSorter[str]()
    features = TopologicalSorter[str]()
    for importer, dependencies in sorted(imports.items()):
        source = Path(importer).relative_to(SOURCE)
        for dependency in sorted(dependencies):
            target = Path(dependency).relative_to(SOURCE)
            check_edge(source, target)
            files.add(importer, dependency)
            if source.parts[0] != target.parts[0]:
                features.add(source.parts[0], target.parts[0])

    files.prepare()
    features.prepare()


def check_public_interfaces(project: Path) -> None:
    config, _ = parse_project_config(PROJECT / "feature-interfaces.toml")
    diagnostics = check(project, config, dependencies=False, interfaces=True)
    assert not diagnostics, format_diagnostics(diagnostics)


def make_project(
    project: Path,
    files: dict[str, str],
) -> None:
    (project / "tach.toml").write_text(
        'source_roots = ["backend/src"]\nignore_type_checking_imports = false\n'
    )
    for relative, content in files.items():
        name = Path(relative)
        file = project / SOURCE / name
        file.parent.mkdir(exist_ok=True, parents=True)
        for parent in name.parents:
            (project / SOURCE / parent / "__init__.py").touch()
        file.write_text(content)


def test_should_accept_aliases_when_published_and_private_symbols_have_correct_consumers(
    tmp_path: Path,
) -> None:
    make_project(
        tmp_path,
        {
            "challenges/api/schemas.py": "FunctionContract = str\nGeneratorInput = str\n",
            "challenges/api/writer.py": "from .schemas import GeneratorInput\n",
            "hints/api/schemas.py": (
                "from typing import TYPE_CHECKING\n"
                "if TYPE_CHECKING:\n"
                "    from ancora.challenges.api.schemas import FunctionContract as Published\n"
            ),
        },
    )
    check_public_interfaces(tmp_path)
    check_import_graph(tmp_path)


def test_should_accept_service_imports_when_feature_boundaries_are_checked() -> None:
    check_public_interfaces(PROJECT)
    check_import_graph(PROJECT)


def test_should_reject_cross_feature_cycles_when_file_graph_is_acyclic(
    tmp_path: Path,
) -> None:
    make_project(
        tmp_path,
        {
            "challenges/domain/models.py": "FunctionContract = str\n",
            "challenges/domain/reader.py": "from ancora.hints.domain.models import Hint\n",
            "hints/domain/models.py": "Hint = str\n",
            "hints/domain/reader.py": (
                "from ancora.challenges.domain.models import FunctionContract\n"
            ),
        },
    )
    with pytest.raises(CycleError) as error:
        check_import_graph(tmp_path)
    assert set(error.value.args[1]) == {"challenges", "hints"}


def test_should_reject_file_cycles_when_all_edges_have_the_same_owner(
    tmp_path: Path,
) -> None:
    make_project(
        tmp_path,
        {
            "challenges/domain/first.py": "from .second import Second\nFirst = str\n",
            "challenges/domain/second.py": "from .first import First\nSecond = str\n",
        },
    )
    with pytest.raises(CycleError, match="first.py"):
        check_import_graph(tmp_path)


@pytest.mark.parametrize(
    ("consumer", "provider", "import_line", "failure"),
    [
        (
            "hints/domain/reader.py",
            "challenges/api/schemas.py",
            "from ancora.challenges.api.schemas import FunctionContract",
            "Layer violation",
        ),
        (
            "hints/infrastructure/reader.py",
            "challenges/infrastructure/adapter.py",
            "from ancora.challenges.infrastructure.adapter import FunctionContract",
            "Private feature infrastructure",
        ),
        (
            "shared/api/reader.py",
            "challenges/api/schemas.py",
            "from ancora.challenges.api.schemas import FunctionContract",
            "Shared code depends on a feature",
        ),
    ],
)
def test_should_reject_imports_when_layer_or_feature_ownership_is_violated(
    tmp_path: Path,
    consumer: str,
    provider: str,
    import_line: str,
    failure: str,
) -> None:
    make_project(
        tmp_path, {consumer: import_line, provider: "FunctionContract = str\n"}
    )

    with pytest.raises(AssertionError, match=failure):
        check_import_graph(tmp_path)


@pytest.mark.parametrize(
    "import_line",
    [
        "from ancora.challenges.api.schemas import GeneratorInput as Private",
        (
            "from typing import TYPE_CHECKING\n"
            "if TYPE_CHECKING:\n"
            "    from ancora.challenges.api.schemas import GeneratorInput as Private"
        ),
        "import ancora.challenges.api.schemas as schemas",
    ],
)
def test_should_reject_private_siblings_when_the_module_exports_a_symbol(
    tmp_path: Path,
    import_line: str,
) -> None:
    make_project(
        tmp_path,
        {
            "challenges/api/schemas.py": "FunctionContract = str\nGeneratorInput = str\n",
            "hints/api/reader.py": import_line,
        },
    )
    with pytest.raises(AssertionError, match="challenges.api.schemas"):
        check_public_interfaces(tmp_path)
