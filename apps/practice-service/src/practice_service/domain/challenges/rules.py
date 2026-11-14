"""Deterministic challenge rules. Reference source is parsed, never executed."""

import ast
import json
import keyword

from practice_service.domain.challenges.errors import DraftInvalid
from practice_service.domain.challenges.models import (
    CaseValue,
    ChallengeDraft,
    GenerationRequest,
    PythonType,
)
from practice_service.domain.challenges.values import validate_case_value


def _annotation_matches(
    annotation: ast.expr | None,
    kind: PythonType,
) -> bool:
    try:
        return (
            annotation is not None and ast.unparse(annotation).replace(" ", "") == kind
        )
    except RecursionError:
        return False


def _validate_reference(draft: ChallengeDraft) -> None:
    try:
        module = ast.parse(draft.reference_source)
    except (SyntaxError, ValueError, RecursionError) as error:
        raise DraftInvalid("reference_syntax_invalid") from error

    if len(module.body) != 1 or not isinstance(module.body[0], ast.FunctionDef):
        raise DraftInvalid("reference_contract_invalid")
    function = module.body[0]
    contract = draft.function_contract
    arguments = function.args
    plain_argument = (
        len(arguments.args) == 1
        and not arguments.posonlyargs
        and not arguments.kwonlyargs
        and arguments.vararg is None
        and arguments.kwarg is None
        and not arguments.defaults
    )
    if not plain_argument or function.decorator_list or function.type_params:
        raise DraftInvalid("reference_contract_invalid")
    parameter = arguments.args[0]
    matches_contract = (
        function.name == contract.name
        and parameter.arg == contract.parameter.name
        and _annotation_matches(parameter.annotation, contract.parameter.type)
        and _annotation_matches(function.returns, contract.returns)
    )
    if not matches_contract:
        raise DraftInvalid("reference_contract_invalid")

    forbidden = (
        ast.Import,
        ast.ImportFrom,
        ast.ClassDef,
        ast.AsyncFunctionDef,
        ast.Global,
        ast.Nonlocal,
    )
    for node in ast.walk(function):
        if isinstance(node, forbidden) or (
            isinstance(node, ast.FunctionDef) and node is not function
        ):
            raise DraftInvalid("reference_structure_invalid")
    required = {"list_comprehension": ast.ListComp, "dict_comprehension": ast.DictComp}
    if draft.technique != "none" and not any(
        isinstance(node, required[draft.technique]) for node in ast.walk(function)
    ):
        raise DraftInvalid("reference_technique_invalid")


def validate_draft(
    draft: ChallengeDraft,
    request: GenerationRequest,
) -> None:
    if draft.concept != request.concept or draft.difficulty != request.difficulty:
        raise DraftInvalid("request_mismatch")
    contract = draft.function_contract
    if keyword.iskeyword(contract.name) or keyword.iskeyword(contract.parameter.name):
        raise DraftInvalid("contract_name_invalid")

    cases = draft.public_cases + draft.check_cases
    if len(cases) > 12 or len({case.id for case in cases}) != len(cases):
        raise DraftInvalid("case_ids_invalid")
    input_values: list[CaseValue] = []
    expectations: dict[str, str] = {}
    for case in cases:
        value = validate_case_value(case.input, contract.parameter.type)
        expected = validate_case_value(case.expected, contract.returns)
        canonical = json.dumps(value, sort_keys=True)
        serialized_expected = json.dumps(expected, sort_keys=True)
        if canonical in expectations and expectations[canonical] != serialized_expected:
            raise DraftInvalid("case_contradiction")
        expectations[canonical] = serialized_expected
        input_values.append(value)

    empty: CaseValue = (
        0
        if contract.parameter.type == "int"
        else ""
        if contract.parameter.type == "str"
        else {}
        if contract.parameter.type.startswith("dict")
        else []
    )
    if empty not in input_values or not any(value != empty for value in input_values):
        raise DraftInvalid("boundary_case_missing")
    _validate_reference(draft)
