# Shared Python convention checkers

Version `0.2.0` is copied byte-for-byte from the engineering playbook's canonical `scripts/python-conventions` package. Both the parameter and condition rules, their implementations and fixtures are shared standards, not Ancora overlays. See the [shared package](https://github.com/brayan/engineering-playbook/tree/a275d193cadddfaea63156724c3626430f63c60a/scripts/python-conventions), [parameter layout](https://github.com/brayan/engineering-playbook/blob/a275d193cadddfaea63156724c3626430f63c60a/docs/engineering/python-parameter-layout.md) and [condition layout](https://github.com/brayan/engineering-playbook/blob/a275d193cadddfaea63156724c3626430f63c60a/docs/engineering/python-condition-layout.md).

Source: [engineering-playbook commit `a275d193cadddfaea63156724c3626430f63c60a`](https://github.com/brayan/engineering-playbook/tree/a275d193cadddfaea63156724c3626430f63c60a/scripts/python-conventions), published in [draft PR #26](https://github.com/brayan/engineering-playbook/pull/26). This is an immutable source pin for version 0.2.0; the shared PR remains under review. These hashes identify the exact copied source without requiring the sibling checkout during checks.

| File | SHA-256 |
|---|---|
| `check_parameter_layout.py` | `d718fe95faef1bfec9d801b11bf05d0539fc8ca2ae6ed4816f384d7550ddefad` |
| `check_condition_layout.py` | `c580ada7b4bf330333fc3ee7df7e2760638abdc628123fb935ca69f60908f441` |
| `tests/test_parameter_layout.py` | `93bfaa100826fda3d7d738891bd246adf5da3f1558072a03e46b4220163a6328` |
| `tests/test_condition_layout.py` | `9d1f309de9467a7a896c10aa17a6304539eceb55f790ff8a2ae38a2d0149c34a` |

`pnpm python:lint` runs both committed checkers over service source/tests, the runner harness, AST-only host tests and this tool directory. `pnpm python:test`, Ruff and strict Pyright cover both tools and their fixtures. The existing Python GitHub Actions job inherits the checks through `python:check` and remains offline. The branch's parameter-checker predicate extraction now matches the shared package; no local source patch remains.

The tools are read-only and never import/execute scanned source. Exit 0 means compliant, 1 means violations, and 2 means invalid input/syntax. Both require explicit maintained paths; empty/missing selections fail closed. See [local condition-check integration](../../../docs/engineering/python-condition-layout.md).

To update, review the canonical package and downstream diff, copy all four files together preserving relative placement, update version/publication status/checksums here, then run `pnpm python:check`. Preserve Ancora's wrappers and scan paths. Standalone fixtures run with `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts/quality/python/tests`. Normal validation reads only the committed local copy and never downloads policy code or requires another repository.
