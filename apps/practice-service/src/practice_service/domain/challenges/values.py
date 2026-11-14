"""Finite challenge values; JSON decoding never evaluates Python source."""

import json
from typing import cast

from practice_service.domain.challenges.errors import DraftInvalid
from practice_service.domain.challenges.models import CaseValue, PythonType


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

    return validate_case_value(value, kind)


def validate_case_value(value: object, kind: PythonType) -> CaseValue:
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
