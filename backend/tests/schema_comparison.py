"""Normalize compatible JSON Schema conventions for cross-language comparisons."""

from typing import cast


def normalize(
    value: object,
    root: dict[str, object],
) -> object:
    if isinstance(value, list):
        return [normalize(element, root) for element in cast(list[object], value)]
    if not isinstance(value, dict):
        return value
    mapping = cast(dict[str, object], value)
    if "$ref" in mapping:
        definitions = cast(dict[str, object], root["$defs"])
        name = cast(str, mapping["$ref"]).removeprefix("#/$defs/")
        return normalize(definitions[name], root)
    is_integer_constant = (
        "const" in mapping
        and type(mapping["const"]) is int
        and mapping.get("type") == "number"
    )
    if is_integer_constant:
        mapping = {**mapping, "type": "integer"}
    return {
        key: sorted(cast(list[str], element))
        if key == "required"
        else normalize(element, root)
        for key, element in mapping.items()
        if key not in ("title", "$schema", "$defs")
    }


def normalize_hint_schema(value: object) -> object:
    if isinstance(value, list):
        return [normalize_hint_schema(item) for item in cast(list[object], value)]
    if not isinstance(value, dict):
        return value
    mapping = {
        key: normalize_hint_schema(item)
        for key, item in cast(dict[str, object], value).items()
    }
    if "propertyNames" in mapping:
        # JSON object property names are strings even when the schema omits the type.
        names = cast(dict[str, object], mapping["propertyNames"])
        mapping["propertyNames"] = {"type": "string", **names}
    if "anyOf" in mapping:
        branches: list[object] = []
        for branch in cast(list[object], mapping["anyOf"]):
            is_nested_union = isinstance(branch, dict) and set(
                cast(dict[str, object], branch)
            ) == {"anyOf"}
            if is_nested_union:
                nested_union = cast(dict[str, object], branch)
                branches.extend(cast(list[object], nested_union["anyOf"]))
            else:
                branches.append(cast(object, branch))
        mapping["anyOf"] = branches
    return mapping
