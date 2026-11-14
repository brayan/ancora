"""Host-safe AST and value rules; source evaluation belongs only to browser tests."""

import ast
import importlib.util
from pathlib import Path
from typing import Protocol, cast

import pytest


class HarnessRules(Protocol):
    def technique_result(
        self, tree: ast.Module, required: str, function_name: str = "positive_even"
    ) -> str: ...

    def contract_matches(self, tree: ast.Module, contract: object) -> bool: ...

    def same_case_value(self, actual: object, expected: object) -> bool: ...

    def supported_value(
        self, value: object, declared_type: str, limit: int = 100
    ) -> bool: ...


def load_rules() -> HarnessRules:
    path = Path(__file__).resolve().parents[2] / "runner" / "harness.py"
    spec = importlib.util.spec_from_file_location("runner_harness", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Missing runner harness module")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    # Expose safe definitions only; these tests never call the execution entry point.
    return cast(HarnessRules, cast(object, module))


rules = load_rules()


@pytest.mark.parametrize(
    ("source", "required", "expected"),
    [
        (
            "def word_sizes(words):\n    return {word: len(word) for word in words}\n",
            "dict_comprehension",
            "passed",
        ),
        (
            "def word_sizes(words):\n    result = {word: len(word) for word in words}\n"
            + "    return result\n",
            "dict_comprehension",
            "passed",
        ),
        (
            "def word_sizes(words):\n    unused = {word: 0 for word in words}\n"
            + "    return dict.fromkeys(words, 1)\n",
            "dict_comprehension",
            "inconclusive",
        ),
        (
            "def word_sizes(words):\n    return dict.fromkeys(words, 1)\n",
            "dict_comprehension",
            "failed",
        ),
        (
            "def word_sizes(words):\n    return [word.upper() for word in words]\n",
            "list_comprehension",
            "passed",
        ),
        (
            "@replacement\ndef word_sizes(words):\n    return [word for word in words]\n",
            "list_comprehension",
            "inconclusive",
        ),
        (
            "def word_sizes(words):\n    return [word for word in words]\n"
            + "word_sizes = replacement\n",
            "list_comprehension",
            "inconclusive",
        ),
        ("def word_sizes(words):\n    return words\n", "none", "not_required"),
    ],
)
def test_should_classify_returned_technique_when_syntax_is_supported(
    source: str, required: str, expected: str
) -> None:
    tree = ast.parse(source)

    assert rules.technique_result(tree, required, "word_sizes") == expected


@pytest.mark.parametrize(
    ("signature", "expected"),
    [
        ("word_sizes(words)", True),
        ("other(words)", False),
        ("word_sizes(other)", False),
        ("word_sizes(words, extra)", False),
        ("word_sizes(words=[])", False),
        ("word_sizes(words, /)", False),
        ("word_sizes(*, words)", False),
        ("word_sizes(*words)", False),
        ("word_sizes(words, **options)", False),
    ],
)
def test_should_match_declared_argument_when_function_signature_is_exact(
    signature: str, expected: bool
) -> None:
    contract = {
        "name": "word_sizes",
        "parameter": {"name": "words", "type": "list[str]"},
        "returns": "dict[str,int]",
    }
    tree = ast.parse(f"def {signature}:\n    return {{}}\n")

    assert rules.contract_matches(tree, contract) is expected


@pytest.mark.parametrize(
    ("value", "declared_type", "expected"),
    [
        (1_000_000, "int", True),
        (True, "int", False),
        (1.0, "int", False),
        (1_000_001, "int", False),
        ("x" * 2_000, "str", True),
        ("x" * 2_001, "str", False),
        ("\U0001f680" * 1_000, "str", True),
        ("\U0001f680" * 1_001, "str", False),
        ("\ud800" * 2_000, "str", True),
        (["word"], "list[str]", True),
        ([1], "list[str]", False),
        ([0] * 100, "list[int]", True),
        ([0] * 101, "list[int]", False),
        ({"word": 4}, "dict[str,int]", True),
        ({"word": "WORD"}, "dict[str,str]", True),
        ({"word": True}, "dict[str,int]", False),
        ({1: "word"}, "dict[str,str]", False),
        ({"x" * 101: 1}, "dict[str,int]", False),
        ({"\U0001f680" * 50: 1}, "dict[str,int]", True),
        ({"\U0001f680" * 51: 1}, "dict[str,int]", False),
        ({"word": {"nested": 1}}, "dict[str,int]", False),
    ],
)
def test_should_bound_values_when_declared_types_are_checked(
    value: object, declared_type: str, expected: bool
) -> None:
    assert rules.supported_value(value, declared_type) is expected


def test_should_preserve_legacy_list_limit_when_v1_results_are_checked() -> None:
    assert rules.supported_value([0] * 1_000, "list[int]", 1_000)
    assert not rules.supported_value([0] * 1_001, "list[int]", 1_000)


def test_should_reject_reordered_dictionary_output_when_values_match_but_order_differs() -> (
    None
):
    expected = {"first": 1, "second": 2}
    actual = {"second": 2, "first": 1}

    assert not rules.same_case_value(actual, expected)
    assert rules.same_case_value({"first": 1, "second": 2}, expected)


def test_should_detect_input_order_mutation_when_dictionary_items_are_reinserted() -> (
    None
):
    original = {"first": "one", "second": "two"}
    changed = original.copy()
    first = changed.pop("first")
    changed["first"] = first

    assert not rules.same_case_value(changed, original)


def test_should_preserve_legacy_list_comparison_when_order_and_duplicates_are_checked() -> (
    None
):
    assert rules.same_case_value([2, 2, 4], [2, 2, 4])
    assert not rules.same_case_value([4, 2, 2], [2, 2, 4])
    assert not rules.same_case_value([2, 4], [2, 2, 4])
