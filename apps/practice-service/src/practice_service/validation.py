"""Deterministic checks only. Reference source is parsed, never executed."""

import ast
import json
import keyword
from typing import cast

from practice_service.contracts import ChallengeDraft, GenerationRequest, PythonType

CaseValue = int | str | list[int] | list[str] | dict[str, int] | dict[str, str]


class DraftInvalid(Exception):
    def __init__(self, issue: str = "structure_invalid") -> None:
        self.issue = issue
        super().__init__(issue)


def _reject_constant(_value: str) -> object:
    raise DraftInvalid("case_json_invalid")


def _unique_object(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise DraftInvalid("case_json_invalid")
        result[key] = value
    return result


def _string_units(value: str) -> int:
    return len(value.encode("utf-16-le", errors="surrogatepass")) // 2


def _scalar_matches(value: object, kind: str) -> bool:
    if kind == "int":
        return type(value) is int and abs(value) <= 1_000_000
    return type(value) is str and _string_units(value) <= 2000


def parse_case_value(source: str, kind: PythonType) -> CaseValue:
    try:
        value: object = json.loads(
            source, parse_constant=_reject_constant, object_pairs_hook=_unique_object
        )
    except (ValueError, RecursionError) as error:
        raise DraftInvalid("case_json_invalid") from error

    if kind in ("int", "str"):
        valid = _scalar_matches(value, kind)
    elif kind.startswith("list"):
        values = cast(list[object], value) if type(value) is list else None
        valid = (
            values is not None
            and len(values) <= 100
            and all(_scalar_matches(element, kind[5:-1]) for element in values)
        )
    else:
        mapping = cast(dict[str, object], value) if type(value) is dict else None
        valid = (
            mapping is not None
            and len(mapping) <= 100
            and all(
                _string_units(key) <= 100 and _scalar_matches(element, kind[9:-1])
                for key, element in mapping.items()
            )
        )

    if not valid:
        raise DraftInvalid("case_type_invalid")
    return cast(CaseValue, value)


def _annotation_matches(annotation: ast.expr | None, kind: PythonType) -> bool:
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


def validate_draft(draft: ChallengeDraft, request: GenerationRequest) -> None:
    if draft.concept != request.concept or draft.difficulty != request.difficulty:
        raise DraftInvalid("request_mismatch")
    contract = draft.function_contract
    if keyword.iskeyword(contract.name) or keyword.iskeyword(contract.parameter.name):
        raise DraftInvalid("contract_name_invalid")

    cases = draft.public_cases + draft.check_cases
    if len(cases) > 12 or len({case.id for case in cases}) != len(cases):
        raise DraftInvalid("case_ids_invalid")
    payload = json.dumps(
        {
            "source": draft.reference_source,
            "cases": [case.model_dump(by_alias=True) for case in cases],
        },
        ensure_ascii=True,
    ).encode("utf-8")
    if len(payload) > 50_000:
        raise DraftInvalid("runner_payload_too_large")

    input_values: list[CaseValue] = []
    expectations: dict[str, str] = {}
    for case in cases:
        value = parse_case_value(case.input_json, contract.parameter.type)
        expected = parse_case_value(case.expected_json, contract.returns)
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
