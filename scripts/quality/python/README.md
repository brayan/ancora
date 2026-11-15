# Python convention checkers

## Shared parameter-layout checker

Version `0.1.0`, adapted without layout-behavior changes from the engineering playbook's `scripts/python-conventions` at commit `4e2a26c9e208164041827da8c0e6daf46f3ab801`, merged in [PR #24](https://github.com/brayan/engineering-playbook/pull/24). Pinned source: [shared checker](https://github.com/brayan/engineering-playbook/tree/4e2a26c9e208164041827da8c0e6daf46f3ab801/scripts/python-conventions); rule: [Python parameter layout](https://github.com/brayan/engineering-playbook/blob/4e2a26c9e208164041827da8c0e6daf46f3ab801/docs/engineering/python-parameter-layout.md). The local script has a predicate-extraction patch so it also follows Ancora’s condition rule; its upstream source checksum is `ddf8a2a6c8ff9684d600d9945d0e2b1b48dda90a643800a731f629fc855c3336`. The original fixtures are unchanged. These checksums identify the installed bytes; local validation is independent of that PR's merge state.

| File | SHA-256 |
|---|---|
| `check_parameter_layout.py` | `b5741b00d47a9613fc2a113e5587e9bcbc195f219e3d66f927fbf3bd5ecfb35c` |
| `tests/test_parameter_layout.py` | `93bfaa100826fda3d7d738891bd246adf5da3f1558072a03e46b4220163a6328` |

`pnpm python:lint` runs the committed checker against service source/tests, the runner harness, its host tests and this tool. `pnpm python:test` includes its positive/negative fixtures. Ruff and strict Pyright cover the tool and fixtures too. The existing Python GitHub Actions job runs these through `pnpm python:check`; no sibling checkout or network download is required.

The checker is read-only, parses AST/tokens, and never imports or executes scanned source. Exit 0 means compliant, 1 means layout violations, 2 means invalid input/syntax. Calls, lambdas and code snippets inside strings are not checked. Empty and missing targets fail. The host interpreter must support the scanned syntax.

To update, review the canonical source and local diff, explicitly copy the checker and `tests/test_parameter_layout.py` preserving relative placement, update version/checksums here, then run `pnpm python:check`. Preserve the local CI wrapper and configured scopes. Standalone fixtures can also run with `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts/quality/python/tests`. Preserve/review the documented local predicate patch until it is adopted upstream; retain exact upstream fixture bytes. Normal validation does not read upstream.


## Ancora condition-layout checker

`check_condition_layout.py` version `0.1.0` enforces [Python condition layout](../../../docs/engineering/python-condition-layout.md). It checks complete `if`/`elif` headers, requires a named predicate for multiline conditions and leaves names/semantics to the developer. It reuses the trusted parameter checker's file selection without importing scanned files. This local overlay is not represented as an upstream playbook release.

`pnpm python:lint` runs both tools over the same maintained scopes. Ruff, strict Pyright and `pnpm python:test` include `tests/test_condition_layout.py`; the existing Python CI job inherits both checks through `python:check` and stays offline. The condition CLI uses the same exit codes: 0 compliant, 1 violations, 2 input/syntax error. Its fixtures cover multiline calls, wrapped names, explicit continuations, `elif`/nested branches, Unicode/encoding, nested colons, excluded expression forms and read-only fail-closed CLI behavior.
