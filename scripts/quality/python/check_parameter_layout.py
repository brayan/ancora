"""Check Python definition layout without importing or executing scanned code."""

import argparse
import ast
import io
import sys
import tokenize
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

VERSION = "0.1.0"
IGNORED_DIRECTORIES = {".git", ".venv", ".tox", "__pycache__", "node_modules"}
Function = ast.FunctionDef | ast.AsyncFunctionDef


@dataclass(frozen=True)
class Violation:
    line: int
    function: str


def parameter_spans(function: Function) -> list[tuple[ast.arg, ast.expr | None]]:
    arguments = function.args
    positional = arguments.posonlyargs + arguments.args
    defaults: list[ast.expr | None] = [None] * (
        len(positional) - len(arguments.defaults)
    ) + list(arguments.defaults)
    spans = list(zip(positional, defaults, strict=True))
    if arguments.vararg is not None:
        spans.append((arguments.vararg, None))
    spans.extend(zip(arguments.kwonlyargs, arguments.kw_defaults, strict=True))
    if arguments.kwarg is not None:
        spans.append((arguments.kwarg, None))
    return spans


def signature_parentheses(
    function: Function,
    tokens: Sequence[tokenize.TokenInfo],
) -> tuple[int, int]:
    definition = next(
        index
        for index, token in enumerate(tokens)
        if token.type == tokenize.NAME
        and token.string == "def"
        and token.start[0] == function.lineno
    )
    # Skip generic type parameters, whose bounds may contain parentheses.
    brackets = 0
    opening = definition
    for index in range(definition + 2, len(tokens)):
        token = tokens[index]
        if token.type != tokenize.OP:
            continue
        if token.string == "[":
            brackets += 1
        elif token.string == "]":
            brackets -= 1
        elif token.string == "(" and brackets == 0:
            opening = index
            break

    depth = 0
    for index in range(opening, len(tokens)):
        token = tokens[index]
        if token.type != tokenize.OP:
            continue
        if token.string == "(":
            depth += 1
        elif token.string == ")":
            depth -= 1
            if depth == 0:
                return opening, index
    raise ValueError("signature parentheses missing")


def check_source(source: str) -> list[Violation]:
    module = ast.parse(source)
    tokens = list(tokenize.generate_tokens(io.StringIO(source).readline))
    lines = source.splitlines()
    violations: list[Violation] = []
    for function in ast.walk(module):
        if not isinstance(function, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        spans = parameter_spans(function)
        if len(spans) < 2:
            continue

        opening, closing = signature_parentheses(function, tokens)
        previous_end = tokens[opening].end[0]
        valid = True
        for parameter, default in spans:
            # AST columns use UTF-8 bytes, unlike tokenize's character columns.
            prefix = lines[parameter.lineno - 1].encode("utf-8")[: parameter.col_offset]
            if parameter.lineno <= previous_end or prefix.strip() not in (
                b"",
                b"*",
                b"**",
            ):
                valid = False
            previous_end = (default or parameter).end_lineno or parameter.lineno

        close = tokens[closing]
        if (
            close.start[0] <= previous_end
            or lines[close.start[0] - 1][: close.start[1]].strip()
        ):
            valid = False
        significant = [
            token
            for token in tokens[opening + 1 : closing]
            if token.type not in (tokenize.NL, tokenize.NEWLINE, tokenize.COMMENT)
        ]
        if not significant or significant[-1].string != ",":
            valid = False
        if not valid:
            violations.append(Violation(function.lineno, function.name))
    return sorted(violations, key=lambda violation: violation.line)


def python_files(paths: Sequence[Path]) -> list[Path]:
    files: set[Path] = set()
    for path in paths:
        path = path.resolve()
        if path.is_file() and path.suffix == ".py":
            files.add(path)
        elif path.is_dir():
            files.update(
                candidate
                for candidate in path.rglob("*.py")
                if candidate.is_file()
                and not any(
                    part in IGNORED_DIRECTORIES
                    for part in candidate.relative_to(path).parts
                )
            )
        else:
            raise ValueError(f"expected a Python file or directory: {path}")
    if not files:
        raise ValueError("no Python files selected")
    return sorted(files)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Require one parameter per line for Python definitions with 2+ parameters. Check-only; never executes scanned code."
    )
    parser.add_argument("--version", action="version", version=VERSION)
    parser.add_argument(
        "paths", nargs="+", type=Path, help="Explicit Python files or directories"
    )
    arguments = parser.parse_args(argv)
    try:
        files = python_files(arguments.paths)
    except (OSError, ValueError) as error:
        parser.error(str(error))

    status = 0
    for path in files:
        try:
            with tokenize.open(path) as stream:
                violations = check_source(stream.read())
        except (
            OSError,
            UnicodeError,
            SyntaxError,
            ValueError,
            tokenize.TokenError,
        ) as error:
            print(
                f"{path}: cannot check Python source ({type(error).__name__})",
                file=sys.stderr,
            )
            status = 2
            continue
        for violation in violations:
            print(
                f"{path}:{violation.line}: {violation.function}: use one parameter per line, a separate closing parenthesis and a trailing comma"
            )
            status = max(status, 1)
    return status


if __name__ == "__main__":
    raise SystemExit(main())
