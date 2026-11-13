import ast
import copy
import json


def technique_result(tree, required):
    if required == "none":
        return "not_required"
    functions = [
        node for node in tree.body
        if isinstance(node, ast.FunctionDef) and node.name == "positive_even"
    ]
    if len(functions) != 1 or len(tree.body) != 1 or functions[0].decorator_list:
        return "inconclusive"
    function = functions[0]
    if not any(isinstance(node, ast.ListComp) for node in ast.walk(function)):
        return "failed"
    body = function.body
    if (
        len(body) == 1
        and isinstance(body[0], ast.Return)
        and isinstance(body[0].value, ast.ListComp)
    ):
        return "passed"
    if (
        len(body) == 2
        and isinstance(body[0], ast.Assign)
        and len(body[0].targets) == 1
        and isinstance(body[0].targets[0], ast.Name)
        and isinstance(body[0].value, ast.ListComp)
        and isinstance(body[1], ast.Return)
        and isinstance(body[1].value, ast.Name)
        and body[1].value.id == body[0].targets[0].id
    ):
        return "passed"
    return "inconclusive"


def evaluate(source, cases, required):
    outcomes = []
    technique = "inconclusive"
    try:
        tree = ast.parse(source)
        technique = technique_result(tree, required)
        namespace = {}
        exec(compile(tree, "<solution>", "exec"), namespace)
        function = namespace.get("positive_even")
        if not callable(function):
            raise ValueError("Define positive_even(values).")
        for case in cases:
            values = copy.deepcopy(case["input"])
            actual = function(values)
            mutated = values != case["input"]
            supported = (
                type(actual) is list
                and len(actual) <= 1000
                and all(type(value) is int and abs(value) <= 1000000 for value in actual)
            )
            outcomes.append({
                "id": case["id"],
                "passed": supported and actual == case["expected"] and not mutated,
                "actual": actual if supported else None,
                "mutated": mutated,
            })
        return json.dumps({"cases": outcomes, "technique": technique, "error": None})
    except BaseException as error:
        return json.dumps({
            "cases": outcomes,
            "technique": technique,
            "error": f"{type(error).__name__}: {str(error)[:900]}",
        })


# This harness only runs inside the disposable browser worker.
evaluate
