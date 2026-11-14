# Shared Python parameter-layout checker

Version `0.1.0`, copied without behavioral changes from the engineering playbook's `scripts/python-conventions` at commit `1f005f7777c619ec0db7f6421ca5df656c3345fe`, published in [draft PR #24](https://github.com/brayan/engineering-playbook/pull/24). Pinned source: [shared checker](https://github.com/brayan/engineering-playbook/tree/1f005f7777c619ec0db7f6421ca5df656c3345fe/scripts/python-conventions); rule: [Python parameter layout](https://github.com/brayan/engineering-playbook/blob/1f005f7777c619ec0db7f6421ca5df656c3345fe/docs/engineering/python-parameter-layout.md). These checksums identify the exact copied bytes; local validation is independent of that PR's merge state.

| File | SHA-256 |
|---|---|
| `check_parameter_layout.py` | `bac282cb968741ab24e7b6e5efefc1b380efac591e3a4125acf0aaffd65658f4` |
| `tests/test_parameter_layout.py` | `bedb30abd142c6fc1568c3c9b4f3bd6537233d61129c38776edd12b462f973f2` |

`pnpm python:lint` runs the committed checker against service source/tests, the runner harness, its host tests and this tool. `pnpm python:test` includes its positive/negative fixtures. Ruff and strict Pyright cover the tool and fixtures too. The existing Python GitHub Actions job runs these through `pnpm python:check`; no sibling checkout or network download is required.

The checker is read-only, parses AST/tokens, and never imports or executes scanned source. Exit 0 means compliant, 1 means layout violations, 2 means invalid input/syntax. Calls, lambdas and code snippets inside strings are not checked. Empty and missing targets fail. The host interpreter must support the scanned syntax.

To update, review the canonical source and local diff, explicitly copy the checker and `tests/test_parameter_layout.py` preserving relative placement, update version/checksums here, then run `pnpm python:check`. Preserve the local CI wrapper and configured scopes. Standalone fixtures can also run with `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts/quality/python/tests`. The source and test bytes should match upstream; normal validation does not read upstream.
