"""Require single-line if/elif headers without executing scanned Python source."""

import argparse
import ast
import io
import sys
import tokenize
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

from check_parameter_layout import python_files

VERSION = "0.2.0"


@dataclass(frozen=True)
class Violation:
    line: int
    keyword: str


def check_source(source: str) -> list[Violation]:
    module = ast.parse(source)
    tokens = list(tokenize.generate_tokens(io.StringIO(source).readline))
    lines = source.split("\n")
    violations: list[Violation] = []
    for branch in ast.walk(module):
        if not isinstance(branch, ast.If):
            continue
        end_line = branch.test.end_lineno
        end_column = branch.test.end_col_offset
        if end_line is None or end_column is None:
            raise ValueError("condition source location missing")

        # AST columns count UTF-8 bytes; token columns count characters.
        prefix = lines[end_line - 1].encode("utf-8")[:end_column]
        end = (end_line, len(prefix.decode("utf-8")))
        keyword = next(
            token
            for token in tokens
            if token.type == tokenize.NAME
            and token.string in {"if", "elif"}
            and token.start[0] == branch.lineno
        )
        # Start after the expression to skip colons in slices, dicts and lambdas.
        colon = next(
            token
            for token in tokens
            if token.type == tokenize.OP and token.string == ":" and token.start >= end
        )
        if keyword.start[0] != colon.start[0]:
            violations.append(Violation(branch.lineno, keyword.string))
    return sorted(violations, key=lambda violation: violation.line)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Extract multiline Python if/elif conditions into named predicates. Check-only; never executes scanned code."
    )
    parser.add_argument("--version", action="version", version=VERSION)
    parser.add_argument("paths", nargs="+", type=Path)
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
            StopIteration,
        ) as error:
            print(
                f"{path}: cannot check Python source ({type(error).__name__})",
                file=sys.stderr,
            )
            status = 2
            continue
        for violation in violations:
            print(
                f"{path}:{violation.line}: {violation.keyword}: extract the multiline condition into a named predicate and keep the branch header on one line"
            )
            status = max(status, 1)
    return status


if __name__ == "__main__":
    raise SystemExit(main())
