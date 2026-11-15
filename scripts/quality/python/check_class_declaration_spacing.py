"""Check class data declaration spacing without executing scanned source."""

import argparse
import ast
import io
import sys
import tokenize
from collections.abc import Sequence
from dataclasses import dataclass
from itertools import pairwise
from pathlib import Path

from check_parameter_layout import python_files

VERSION = "0.3.0"


@dataclass(frozen=True)
class Violation:
    line: int
    class_name: str
    message: str


def check_source(source: str) -> list[Violation]:
    module = ast.parse(source)
    tokens = tokenize.generate_tokens(io.StringIO(source).readline)
    lines = source.split("\n")
    section_comments = {
        token.start[0]
        for token in tokens
        if token.type == tokenize.COMMENT
        and not lines[token.start[0] - 1][: token.start[1]].strip()
    }
    violations: list[Violation] = []
    for node in ast.walk(module):
        if not isinstance(node, ast.ClassDef):
            continue
        for previous, current in pairwise(node.body):
            are_data_declarations = isinstance(
                previous, (ast.Assign, ast.AnnAssign)
            ) and isinstance(current, (ast.Assign, ast.AnnAssign))
            if not are_data_declarations:
                continue
            if previous.end_lineno is None or current.end_lineno is None:
                raise ValueError("declaration source location missing")

            gap = range(previous.end_lineno + 1, current.lineno)
            blank_lines = [line for line in gap if not lines[line - 1].strip()]
            if not blank_lines:
                continue
            permits_separator = (
                previous.lineno != previous.end_lineno
                or current.lineno != current.end_lineno
                or any(line in section_comments for line in gap)
            )
            if not permits_separator:
                violations.append(
                    Violation(
                        blank_lines[0],
                        node.name,
                        "remove the blank line between consecutive single-line class data declarations",
                    )
                )
                continue
            repeated_blank = next(
                (
                    later
                    for earlier, later in pairwise(blank_lines)
                    if later == earlier + 1
                ),
                None,
            )
            if repeated_blank is not None:
                violations.append(
                    Violation(
                        repeated_blank,
                        node.name,
                        "use at most one consecutive blank line between class data declarations",
                    )
                )
    return sorted(violations, key=lambda violation: violation.line)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Keep consecutive single-line class data declarations together. Check-only; never executes scanned code."
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
        ) as error:
            print(
                f"{path}: cannot check Python source ({type(error).__name__})",
                file=sys.stderr,
            )
            status = 2
            continue
        for violation in violations:
            print(
                f"{path}:{violation.line}: {violation.class_name}: {violation.message}"
            )
            status = max(status, 1)
    return status


if __name__ == "__main__":
    raise SystemExit(main())
