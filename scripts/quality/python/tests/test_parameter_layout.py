import contextlib
import io
import sys
import tempfile
import unittest
from pathlib import Path

# Keep standalone unittest discovery independent of downstream import settings.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from check_parameter_layout import check_source, main


class ParameterLayoutTests(unittest.TestCase):
    def test_should_accept_definitions_when_each_parameter_has_its_own_line(
        self,
    ) -> None:
        examples = [
            "def empty(): pass",
            "def single(value: int) -> int: return value",
            "def pair(\n    left: int,\n    right: int,\n): pass",
            "async def pair(\n    left,\n    right,  # retained comment\n): pass",
            "def separated(\n    first,\n    /,\n    second=2,\n    *,\n    third=3,\n): pass",
            "def variadic(\n    *values: int,\n    **options: str,\n): pass",
            "def defaults(\n    first=lambda x, y: (x, y),\n    second=(1, 2),\n): pass",
            "def annotated(\n    first: tuple[\n        int,\n        str,\n    ],\n    second: str,\n): pass",
            "class Example:\n    def method(\n        self,\n        value,\n    ): pass",
            "@decorator(1, 2)\ndef decorated(\n    first,\n    second,\n): pass",
            'text = "def example(first, second): pass"\nconsume(1, 2)\ncallback = lambda x, y: x + y',
            "def café(\n    prénom: str,\n    âge: int,\n): pass",
        ]
        for source in examples:
            with self.subTest(source=source):
                self.assertEqual(check_source(source), [])

    def test_should_reject_layout_when_parameters_share_lines_or_lack_commas(
        self,
    ) -> None:
        examples = [
            "def pair(first, second): pass",
            "def pair(first,\n    second,\n): pass",
            "def pair(\n    first, second,\n): pass",
            "def pair(\n    first,\n    second): pass",
            "def pair(\n    first,\n    second\n): pass",
            "def pair(\n    first=(\n        1,\n    ), second=2,\n): pass",
            "class Example:\n    def method(self, value): pass",
            "def pair(*args, **kwargs): pass",
            "async def pair(first, second): pass",
        ]
        for source in examples:
            with self.subTest(source=source):
                self.assertEqual(len(check_source(source)), 1)

    def test_should_inspect_nested_definitions_when_outer_function_has_no_parameters(
        self,
    ) -> None:
        violations = check_source("def outer():\n    def inner(left, right): pass\n")
        self.assertEqual(
            [(violation.line, violation.function) for violation in violations],
            [(2, "inner")],
        )

    @unittest.skipUnless(
        sys.version_info >= (3, 12), "Generic syntax requires Python 3.12"
    )
    def test_should_find_signature_when_generic_bounds_contain_parentheses(
        self,
    ) -> None:
        source = (
            "def generic[T: type((int, str))](\n    left: T,\n    right: T,\n): pass"
        )
        self.assertEqual(check_source(source), [])

    def test_should_fail_closed_when_source_has_invalid_syntax(self) -> None:
        with self.assertRaises(SyntaxError):
            check_source("def broken(")

    def test_should_preserve_physical_lines_when_literals_contain_other_separators(
        self,
    ) -> None:
        for separator in (
            "\u2028",
            "\u2029",
            "\x85",
            "\v",
            "\f",
            "\x1c",
            "\x1d",
            "\x1e",
        ):
            examples = [
                f'text = "hello{separator}world"\ndef pair(\n    left,\n    right,\n): pass',
                f'def pair(\n    left="hello{separator}world",\n    right=2,\n): pass',
            ]
            for source in examples:
                with self.subTest(separator=repr(separator), source=source):
                    self.assertEqual(check_source(source), [])

    def test_should_accept_compliant_definitions_when_indentation_contains_form_feed(
        self,
    ) -> None:
        source = "def pair(\n\f    left,\n\f    right,\n\f): pass"
        self.assertEqual(check_source(source), [])

    def test_should_report_physical_line_when_a_violation_follows_unicode_text(
        self,
    ) -> None:
        source = 'text = "hello\u2028world"\ndef pair(left, right): pass'
        violations = check_source(source)
        self.assertEqual(
            [(violation.line, violation.function) for violation in violations],
            [(2, "pair")],
        )

    def test_should_find_definition_when_async_headers_use_line_continuations(
        self,
    ) -> None:
        examples = [
            "async \\\ndef pair(\n    left,\n    right,\n): pass",
            "def first(value): pass\nasync \\\ndef pair(\n    left,\n    right,\n): pass",
            "def outer():\n    async \\\n    def pair(\n        left,\n        right,\n    ): pass",
        ]
        for source in examples:
            with self.subTest(source=source):
                self.assertEqual(check_source(source), [])

    def test_should_report_layout_violation_when_async_header_is_continued(
        self,
    ) -> None:
        violations = check_source("async \\\ndef pair(left, right): pass")
        self.assertEqual(
            [(violation.line, violation.function) for violation in violations],
            [(1, "pair")],
        )

    def test_should_scan_later_files_when_a_compliant_async_header_is_continued(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "a_good.py").write_text(
                "async \\\ndef pair(\n    left,\n    right,\n): pass"
            )
            (root / "b_bad.py").write_text("def pair(left, right): pass")
            with contextlib.redirect_stdout(io.StringIO()) as output:
                status = main([str(root)])

            self.assertEqual(status, 1)
            self.assertIn("b_bad.py:1:", output.getvalue())
            self.assertNotIn("a_good.py", output.getvalue())

    def test_should_check_files_without_mutation_or_execution_when_cli_runs(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "example.py"
            source = "raise RuntimeError('must never execute')\ndef pair(left, right): pass\n"
            path.write_text(source)
            with contextlib.redirect_stdout(io.StringIO()) as output:
                status = main([str(path)])
            self.assertEqual(status, 1)
            self.assertIn("example.py:2:", output.getvalue())
            self.assertEqual(path.read_text(), source)

    def test_should_return_input_error_when_file_cannot_be_parsed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "broken.py"
            path.write_text("def broken(")
            with contextlib.redirect_stderr(io.StringIO()) as output:
                status = main([str(path)])
            self.assertEqual(status, 2)
            self.assertIn("SyntaxError", output.getvalue())

    def test_should_skip_environment_directories_when_a_tree_is_selected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "good.py").write_text("def single(value): pass")
            environment = root / ".venv"
            environment.mkdir()
            (environment / "ignored.py").write_text("def pair(left, right): pass")
            self.assertEqual(main([str(root)]), 0)

    def test_should_fail_closed_when_target_is_missing_or_has_no_python_files(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as directory:
            for path in (str(Path(directory) / "missing.py"), directory):
                with (
                    self.subTest(path=path),
                    contextlib.redirect_stderr(io.StringIO()),
                    self.assertRaises(SystemExit) as error,
                ):
                    main([path])
                self.assertEqual(error.exception.code, 2)


if __name__ == "__main__":
    unittest.main()
