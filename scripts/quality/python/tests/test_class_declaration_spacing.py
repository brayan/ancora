import contextlib
import io
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from check_class_declaration_spacing import check_source, main


class ClassDeclarationSpacingTests(unittest.TestCase):
    def test_should_accept_declarations_when_single_line_fields_are_adjacent(
        self,
    ) -> None:
        source = (
            "class Settings:\n"
            "    model_config = configure(prefix='EDGE_')\n"
            "    log_level: str = 'info'\n"
            "    enabled: bool\n"
            "    RETRIES = 3\n"
        )
        self.assertEqual(check_source(source), [])

    def test_should_reject_blank_separators_when_both_declarations_are_single_line(
        self,
    ) -> None:
        for first in ("model_config = configure()", "first: int", "first: int = 1"):
            for second in ("second = 2", "second: int", "second: int = 2"):
                with self.subTest(first=first, second=second):
                    source = f"class Settings:\n    {first}\n \t\n    {second}\n"
                    violations = check_source(source)
                    self.assertEqual(
                        [(value.line, value.class_name) for value in violations],
                        [(3, "Settings")],
                    )
                    self.assertIn("single-line", violations[0].message)

    def test_should_allow_optional_separator_when_either_declaration_is_multiline(
        self,
    ) -> None:
        examples = [
            "    first = configure(\n        enabled=True,\n    )\n{gap}    second = 2\n",
            "    first = 1\n{gap}    second = (\n        2,\n    )\n",
            "    first = (\n        1,\n    )\n{gap}    second = (\n        2,\n    )\n",
            "    first: tuple[\n        int,\n        str,\n    ]\n{gap}    second: int\n",
            "    first = \\\n        1\n{gap}    second = 2\n",
            '    first = """# value\nnot a section comment"""\n{gap}    second = 2\n',
        ]
        for body in examples:
            for gap in ("", "\n"):
                with self.subTest(body=body, gap=gap):
                    source = "class Settings:\n" + body.format(gap=gap)
                    self.assertEqual(check_source(source), [])

    def test_should_allow_sections_when_comments_occupy_their_own_line(self) -> None:
        for gap in (
            "    # Transport\n",
            "\n    # Transport\n",
            "    # Transport\n\n",
            "\n    # Transport\n\n",
            "\n    # Transport\n    # Defaults\n\n",
        ):
            with self.subTest(gap=gap):
                source = "class Settings:\n    first = 1\n" + gap + "    second = 2\n"
                self.assertEqual(check_source(source), [])

    def test_should_reject_separator_when_comment_is_only_inline(self) -> None:
        source = "class Settings:\n    first = 1  # Transport\n\n    second = 2\n"
        self.assertEqual(len(check_source(source)), 1)

    def test_should_limit_repeated_blank_lines_when_an_exception_permits_separation(
        self,
    ) -> None:
        examples = [
            "class Settings:\n    first = (\n        1,\n    )\n\n\n    second = 2\n",
            "class Settings:\n    first = 1\n\n\n    # Section\n    second = 2\n",
            "class Settings:\n    first = 1\n    # Section\n\n\n    second = 2\n",
        ]
        for source in examples:
            with self.subTest(source=source):
                violations = check_source(source)
                self.assertEqual(len(violations), 1)
                self.assertIn("at most one", violations[0].message)

    def test_should_check_each_class_when_classes_are_nested(self) -> None:
        source = (
            "class Outer:\n    first = 1\n\n    second = 2\n"
            "    class Inner:\n        first = 1\n\n        second = 2\n"
        )
        self.assertEqual(
            [(value.line, value.class_name) for value in check_source(source)],
            [(3, "Outer"), (7, "Inner")],
        )

    def test_should_preserve_other_spacing_when_statements_break_the_sequence(
        self,
    ) -> None:
        examples = [
            "first = 1\n\nsecond = 2\n",
            "def run():\n    first = 1\n\n    second = 2\n",
            "class Settings:\n    first = 1\n\n    def run(self):\n        pass\n\n    second = 2\n",
            "class Settings:\n    first = 1\n\n    class Inner:\n        pass\n\n    second = 2\n",
            'class Settings:\n    """Docstring."""\n\n    first = 1\n',
            "class Settings:\n    first = 1\n\n    @property\n    def value(self):\n        return 1\n",
            'class Settings:\n    first = 1\n\n    """Field documentation."""\n\n    second = 2\n',
            "class Settings:\n    first = 1; second = 2\n",
        ]
        for source in examples:
            with self.subTest(source=source):
                self.assertEqual(check_source(source), [])

    def test_should_use_physical_lines_when_source_has_crlf_or_unicode_separators(
        self,
    ) -> None:
        source = 'class Settings:\r\n    first = "hello\u2028world"\r\n\r\n    second = 2\r\n'
        self.assertEqual([value.line for value in check_source(source)], [3])
        self.assertEqual(
            check_source("class Settings:\n    first = 1\n\f    second = 2\n"), []
        )

    def test_should_check_without_writes_or_execution_when_cli_reads_source(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "example.py"
            source = b"raise RuntimeError('must not run')\nclass Settings:\n    first = 1\n\n    second = 2\n"
            path.write_bytes(source)
            with contextlib.redirect_stdout(io.StringIO()) as output:
                status = main([str(path), str(path)])
            self.assertEqual(status, 1)
            self.assertEqual(output.getvalue().count("example.py:4: Settings:"), 1)
            self.assertNotIn("must not run", output.getvalue())
            self.assertEqual(path.read_bytes(), source)

    def test_should_keep_error_status_when_later_files_have_spacing_violations(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "a_broken.py").write_text("class (")
            (root / "b_bad.py").write_text(
                "class Settings:\n    first = 1\n\n    second = 2\n"
            )
            with (
                contextlib.redirect_stdout(io.StringIO()) as output,
                contextlib.redirect_stderr(io.StringIO()) as errors,
            ):
                status = main([str(root)])
            self.assertEqual(status, 2)
            self.assertIn("SyntaxError", errors.getvalue())
            self.assertIn("b_bad.py:3:", output.getvalue())

    def test_should_read_encoding_and_skip_environments_when_cli_scans_tree(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "good.py").write_bytes(
                '# coding: latin-1\nclass Settings:\n    first = "é"\n    second = 2\n'.encode(
                    "latin-1"
                )
            )
            ignored = root / ".venv"
            ignored.mkdir()
            (ignored / "bad.py").write_text(
                "class Settings:\n    first = 1\n\n    second = 2\n"
            )
            self.assertEqual(main([str(root)]), 0)

    def test_should_fail_closed_when_targets_are_missing_empty_or_not_python(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            text = root / "file.txt"
            text.write_text("not Python")
            for target in (root / "missing", root, text):
                with self.subTest(target=target):
                    with (
                        contextlib.redirect_stderr(io.StringIO()),
                        self.assertRaises(SystemExit) as raised,
                    ):
                        main([str(target)])
                    self.assertEqual(raised.exception.code, 2)


if __name__ == "__main__":
    unittest.main()
