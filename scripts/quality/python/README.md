# Shared Python convention checkers

Version `0.3.0` is copied byte-for-byte from the engineering playbook's canonical `scripts/python-conventions` package. The parameter, condition and class declaration spacing rules, their implementations and fixtures are shared standards, not Ancora overlays. See the [shared package](https://github.com/brayan/engineering-playbook/tree/b6d8ae17a005fb64f3440605dbdc8d2912fef46e/scripts/python-conventions), [parameter layout](https://github.com/brayan/engineering-playbook/blob/b6d8ae17a005fb64f3440605dbdc8d2912fef46e/docs/engineering/python-parameter-layout.md), [condition layout](https://github.com/brayan/engineering-playbook/blob/b6d8ae17a005fb64f3440605dbdc8d2912fef46e/docs/engineering/python-condition-layout.md) and [class declaration spacing](https://github.com/brayan/engineering-playbook/blob/b6d8ae17a005fb64f3440605dbdc8d2912fef46e/docs/engineering/python-class-declaration-spacing.md).

Source: [engineering-playbook commit `b6d8ae17a005fb64f3440605dbdc8d2912fef46e`](https://github.com/brayan/engineering-playbook/tree/b6d8ae17a005fb64f3440605dbdc8d2912fef46e/scripts/python-conventions), published in [draft PR #26](https://github.com/brayan/engineering-playbook/pull/26). This is an immutable source pin for version 0.3.0; the shared PR remains under review. These hashes identify the exact copied source without requiring the sibling checkout during checks.

| File | SHA-256 |
|---|---|
| `check_parameter_layout.py` | `1e599c7460e37ff2bfc10c390d9449e8307f2062c63aa94cdca1bce8d7a43e5e` |
| `check_condition_layout.py` | `eac03622814e7fbe52f15fe433baa75b16674944e81ffd10831bd029f7bcc55e` |
| `check_class_declaration_spacing.py` | `b43db6596e283461404aee0a921ba8db12c5f85353f1d4685876bb30d825f56a` |
| `tests/test_parameter_layout.py` | `93bfaa100826fda3d7d738891bd246adf5da3f1558072a03e46b4220163a6328` |
| `tests/test_condition_layout.py` | `9d1f309de9467a7a896c10aa17a6304539eceb55f790ff8a2ae38a2d0149c34a` |
| `tests/test_class_declaration_spacing.py` | `3990ec6dfbd543b7aeec3bd2d92a6be99cb04b36e6a768fc75260be05c018719` |

`pnpm python:lint` runs all three committed checkers over service source/tests, the runner harness, AST-only host tests and this tool directory. `pnpm python:test`, Ruff and strict Pyright cover all three tools and their fixtures. The existing Python GitHub Actions job inherits the checks through `python:check` and remains offline. Enabled rules are parameter layout, condition layout and class declaration spacing. The shared package is copied without local source patches.

The tools are read-only and never import/execute scanned source. Exit 0 means compliant, 1 means violations, and 2 means invalid input/syntax. All require explicit maintained paths; empty/missing selections fail closed. See [local condition-check integration](../../../docs/engineering/python-condition-layout.md).

To update, review the canonical package and downstream diff, copy all six files together preserving relative placement, update version/publication status/checksums here, then run `pnpm python:check`. Preserve Ancora's wrappers and scan paths. Standalone fixtures run with `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts/quality/python/tests`. Normal validation reads only the committed local copy and never downloads policy code or requires another repository.
