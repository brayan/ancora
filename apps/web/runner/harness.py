import ast
import copy
import json
from collections.abc import Callable
from typing import Literal, TypedDict, cast

PythonType = Literal[
    "int", "str", "list[int]", "list[str]", "dict[str,int]", "dict[str,str]"
]
Technique = Literal["none", "list_comprehension", "dict_comprehension"]
TechniqueResult = Literal["passed", "failed", "inconclusive", "not_required"]


def declared_function(
    tree: ast.Module,
    name: str,
) -> ast.FunctionDef | None:
    functions = [
        node
        for node in tree.body
        if isinstance(node, ast.FunctionDef) and node.name == name
    ]
    return functions[0] if len(functions) == 1 else None


class CaseResult(TypedDict):
    actual: object
    id: str
    mutated: bool
    passed: bool


class ParameterContract(TypedDict):
    name: str
    type: PythonType


class FunctionContract(TypedDict):
    name: str
    parameter: ParameterContract
    returns: PythonType


def contract_matches(
    tree: ast.Module,
    contract: FunctionContract,
) -> bool:
    function = declared_function(tree, contract["name"])
    if function is None or function.decorator_list:
        return False

    arguments = function.args
    return (
        len(tree.body) == 1
        and len(arguments.args) == 1
        and arguments.args[0].arg == contract["parameter"]["name"]
        and not arguments.posonlyargs
        and not arguments.kwonlyargs
        and arguments.vararg is None
        and arguments.kwarg is None
        and not arguments.defaults
    )


def technique_result(
    tree: ast.Module,
    required: Technique,
    function_name: str = "positive_even",
) -> TechniqueResult:
    if required == "none":
        return "not_required"

    function = declared_function(tree, function_name)
    if function is None or len(tree.body) != 1 or function.decorator_list:
        return "inconclusive"

    comprehension = ast.DictComp if required == "dict_comprehension" else ast.ListComp
    if not any(isinstance(node, comprehension) for node in ast.walk(function)):
        return "failed"

    body = function.body
    returns_comprehension_directly = (
        len(body) == 1
        and isinstance(body[0], ast.Return)
        and isinstance(body[0].value, comprehension)
    )
    if returns_comprehension_directly:
        return "passed"
    returns_assigned_comprehension = (
        len(body) == 2
        and isinstance(body[0], ast.Assign)
        and len(body[0].targets) == 1
        and isinstance(body[0].targets[0], ast.Name)
        and isinstance(body[0].value, comprehension)
        and isinstance(body[1], ast.Return)
        and isinstance(body[1].value, ast.Name)
        and body[1].value.id == body[0].targets[0].id
    )
    if returns_assigned_comprehension:
        return "passed"
    return "inconclusive"


def bounded_integer(value: object) -> bool:
    return type(value) is int and abs(value) <= 1_000_000


def wire_string_length(value: str) -> int:
    # Match JavaScript wire bounds, including astral characters and lone surrogates.
    return len(value.encode("utf-16-le", errors="surrogatepass")) // 2


def bounded_string(value: object) -> bool:
    return type(value) is str and wire_string_length(value) <= 2_000


def supported_value(
    value: object,
    declared_type: PythonType,
    limit: int = 100,
) -> bool:
    if declared_type == "int":
        return bounded_integer(value)
    if declared_type == "str":
        return bounded_string(value)

    valid_item = bounded_integer if declared_type.endswith("int]") else bounded_string
    if declared_type.startswith("list["):
        if type(value) is not list:
            return False
        entries = cast(list[object], value)
        return len(entries) <= limit and all(valid_item(item) for item in entries)
    if type(value) is not dict:
        return False

    mapping = cast(dict[object, object], value)
    return len(mapping) <= limit and all(
        type(key) is str and wire_string_length(key) <= 100 and valid_item(item)
        for key, item in mapping.items()
    )


def same_case_value(
    actual: object,
    expected: object,
) -> bool:
    if type(actual) is dict and type(expected) is dict:
        actual_items = cast(dict[object, object], actual).items()
        expected_items = cast(dict[object, object], expected).items()
        return list(actual_items) == list(expected_items)
    return actual == expected


class RunnerCase(TypedDict):
    expected: object
    id: str
    input: object


class RunnerEvaluation:
    """Keep case evidence while the browser adapter owns execution and exceptions."""

    def __init__(
        self,
        cases: list[RunnerCase],
        required: Technique,
        contract: FunctionContract | None = None,
    ) -> None:
        self.cases = cases
        self.required: Technique = required
        self.contract = contract
        self.function_name = contract["name"] if contract else "positive_even"
        self.outcomes: list[CaseResult] = []
        self.technique: TechniqueResult = "inconclusive"

    def prepare(
        self,
        source: str,
    ) -> dict[str, object]:
        tree = ast.parse(source)
        self.technique = technique_result(tree, self.required, self.function_name)
        if self.contract is not None and not contract_matches(tree, self.contract):
            raise ValueError("Define exactly the declared function and parameter.")

        # Pyodide executes only after preflight, in this fresh solution namespace.
        return {}

    def check(
        self,
        namespace: dict[str, object],
    ) -> None:
        candidate = namespace.get(self.function_name)
        if not callable(candidate):
            raise TypeError(f"Define {self.function_name} with its declared parameter.")
        # The runtime call boundary follows the callable check; result data stays untrusted.
        function = cast(Callable[[object], object], candidate)

        for case in self.cases:
            values = copy.deepcopy(case["input"])
            actual = function(values)
            mutated = not same_case_value(values, case["input"])
            supported = supported_value(
                actual,
                self.contract["returns"] if self.contract else "list[int]",
                100 if self.contract else 1000,
            )
            self.outcomes.append(
                {
                    "id": case["id"],
                    "passed": supported
                    and same_case_value(actual, case["expected"])
                    and not mutated,
                    "actual": actual if supported else None,
                    "mutated": mutated,
                }
            )

    def report(
        self,
        error: BaseException | None = None,
    ) -> str:
        return json.dumps(
            {
                "cases": self.outcomes,
                "technique": self.technique,
                "error": (
                    f"{type(error).__name__}: {str(error)[:900]}"
                    if error is not None
                    else None
                ),
            }
        )
