import contextlib
import io
import sys
import tempfile
import unittest
from pathlib import Path

# Keep standalone unittest discovery independent of downstream import settings.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from check_condition_layout import check_source, main


class ConditionLayoutTests(unittest.TestCase):
    def test_should_accept_headers_when_conditions_are_single_line_or_named(
        self,
    ) -> None:
        examples = [
            "if ready: run()",
            "is_invalid = (\n    not ready\n    or not valid\n)\nif is_invalid:\n    reject()",
            "if ready:\n    run()\nelif valid:\n    retry()",
            'if "é" in {"é": 1}: pass',
            'if (lambda text: text)("é"): pass',
            "if values[1:3]: pass",
            "if ready:  # comment mentioning if (\n    run()",
            'text = "if (\\nready\\n): pass"',
            'text = "hello\u2028world"\nif ready: pass',
            "if (ready): pass",
        ]
        for source in examples:
            with self.subTest(source=source):
                self.assertEqual(check_source(source), [])

    def test_should_reject_headers_when_conditions_span_physical_lines(
        self,
    ) -> None:
        examples = [
            "if (\n    ready\n    and valid\n): pass",
            "if (\n    ready\n): pass",
            "if search(\n    text,\n): pass",
            "if ready \\\n    and valid: pass",
            "if \\\n    ready: pass",
            'if (lambda text: text)(\n    "é",\n): pass',
            'if {\n    "é": 1,\n}: pass',
            "if values[\n    1:3\n]: pass",
            "if (\n    ready  # retain this explanation when extracting\n): pass",
            'if """first\nsecond""": pass',
            "if (\r\n    ready\r\n): pass",
        ]
        for source in examples:
            with self.subTest(source=source):
                violations = check_source(source)
                self.assertEqual(
                    [(value.line, value.keyword) for value in violations], [(1, "if")]
                )

    def test_should_report_elif_and_nested_if_when_their_headers_are_multiline(
        self,
    ) -> None:
        source = (
            "if ready:\n    pass\nelif (\n    valid\n):\n"
            "    if (\n        enabled\n    ): pass\n"
        )
        violations = check_source(source)
        self.assertEqual(
            [(value.line, value.keyword) for value in violations],
            [(3, "elif"), (6, "if")],
        )

    def test_should_ignore_other_expressions_when_they_are_not_if_statements(
        self,
    ) -> None:
        examples = [
            "while (\n    pending\n): poll()",
            "value = first if (\n    ready\n) else second",
            "values = [item for item in source if (\n    item\n)]",
            "match value:\n    case _ if (\n        ready\n    ): pass",
        ]
        for source in examples:
            with self.subTest(source=source):
                self.assertEqual(check_source(source), [])

    def test_should_find_header_colon_when_nested_expressions_contain_colons(
        self,
    ) -> None:
        source = 'if (\n    "é" in {"é": values[1:3]}\n    and (lambda text: text)("é")\n): pass'
        self.assertEqual(len(check_source(source)), 1)

    def test_should_check_without_mutation_or_execution_when_cli_scans_source(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "example.py"
            source = (
                "raise RuntimeError('must not execute')\nif (\n    ready\n): pass\n"
            )
            path.write_text(source)
            with contextlib.redirect_stdout(io.StringIO()) as output:
                status = main([str(path)])

            self.assertEqual(status, 1)
            self.assertIn("example.py:2: if:", output.getvalue())
            self.assertIn("named predicate", output.getvalue())
            self.assertEqual(path.read_text(), source)

    def test_should_keep_input_error_status_when_later_files_also_violate_layout(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "a_broken.py").write_text("if (")
            (root / "b_bad.py").write_text("if (\n    ready\n): pass")
            with (
                contextlib.redirect_stdout(io.StringIO()) as output,
                contextlib.redirect_stderr(io.StringIO()) as errors,
            ):
                status = main([str(root)])

            self.assertEqual(status, 2)
            self.assertIn("SyntaxError", errors.getvalue())
            self.assertIn("b_bad.py:1:", output.getvalue())

    def test_should_read_encoding_and_skip_environment_files_when_scanning_a_tree(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "good.py").write_bytes(
                '# coding: latin-1\nif "é" in {"é": 1}: pass\n'.encode("latin-1")
            )
            environment = root / ".venv"
            environment.mkdir()
            (environment / "ignored.py").write_text("if (\n    ready\n): pass")
            self.assertEqual(main([str(root)]), 0)

    def test_should_fail_closed_when_target_is_missing_or_has_no_python_files(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as directory:
            for target in (str(Path(directory) / "missing.py"), directory):
                with (
                    self.subTest(target=target),
                    contextlib.redirect_stderr(io.StringIO()),
                    self.assertRaises(SystemExit) as error,
                ):
                    main([target])
                self.assertEqual(error.exception.code, 2)


if __name__ == "__main__":
    unittest.main()
