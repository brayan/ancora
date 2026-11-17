# Python condition-check integration

The [engineering playbook’s Python Condition Layout](https://github.com/brayan/engineering-playbook/blob/6a41791644d300aa3075e935b81529f5942ccb96/docs/engineering/python-condition-layout.md) owns the rule: extract multiline `if`/`elif` conditions into named predicates, preserving evaluation semantics. The shared standard owns scope, examples and exclusions; this page records only Ancora’s integration.

`pnpm python:lint` invokes installed `sailtech-check-conditions` over `backend`, `web/runner/harness.py` and `web/tests/python`. `pnpm python:check` and the existing Python GitHub Actions job inherit enforcement. Exit 1 reports violations; exit 2 reports invalid input or analysis failure. The command never imports scanned modules, accesses the network or auto-fixes predicate names.

The locked package replaces the former copied checker source and fixtures. Version, immutable source revision, wheel hash and upgrade procedure live in [the artifact provenance](../../config/quality/python/README.md). Ancora tests downstream orchestration; the playbook owns checker behavior and fixtures. Normal validation needs neither a sibling checkout nor a source download. TypeScript/JavaScript policy is unchanged.
