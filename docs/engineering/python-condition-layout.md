# Python condition-check integration

The [engineering playbook's Python Condition Layout](https://github.com/brayan/engineering-playbook/blob/b6d8ae17a005fb64f3440605dbdc8d2912fef46e/docs/engineering/python-condition-layout.md) owns the rule: extract multiline `if`/`elif` conditions into named predicates, preserving evaluation semantics. The shared standard owns scope, examples and exclusions; this page records only Ancora's integration.

`pnpm python:lint` runs the copied `scripts/quality/python/check_condition_layout.py` across service source/tests, the browser harness, AST-only host tests and convention tools. `pnpm python:check` and the existing Python GitHub Actions job inherit enforcement and stay offline. Exit 1 reports file/line violations; exit 2 reports invalid inputs/syntax. The shared checker reports rather than auto-fixes predicate names.

Ruff, strict Pyright and pytest include the committed tools and fixtures. The scan covers maintained Python only; the TypeScript/JavaScript policy is unchanged. Exact shared source version, publication status and checksums live in [the local provenance](../../scripts/quality/python/README.md). The playbook remains the canonical owner; normal checks never require a sibling checkout or network download.
