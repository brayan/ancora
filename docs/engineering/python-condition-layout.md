# Python condition layout

Python `if` and `elif` headers must fit on one physical line. Extract a multiline condition into a named predicate immediately before the branch. Choose a name that explains the decision, such as `is_invalid_feedback_text`, rather than `condition` or `result`. Keep the predicate expression formatted normally and preserve contextual paragraph grouping.

```python
is_invalid_feedback_text = (
    not text.strip()
    or units > 900
    or "```" in text
    or re.search(r"\b(?:async\s+)?def\s+\w+\s*\(", text) is not None
)
if is_invalid_feedback_text:
    raise CoachingInvalid
```

Use normal Python parentheses around the multiline assignment; parentheses around the name in `if` are unnecessary. Keep short conditions inline. Avoid packing a long condition onto one line to evade the rule; Ruff formatting and the checker must both pass.

## Preserve evaluation semantics

Keep operands in their original order and preserve `and`/`or` short-circuiting. A preceding type check may protect later attribute access. If extraction removes static type narrowing needed inside the branch, use a meaningful typed boundary or explicit narrowing rather than weakening typing.

Do not calculate a later `elif` predicate before earlier branches have been rejected. Nest that later decision inside `else`, or use an independent `if` after an earlier returning branch when behavior permits. The checker reports violations and does not auto-fix them because naming, side effects and branch order require judgment.

`while` conditions, conditional expressions, comprehension filters and match guards are outside this rule. In particular, moving a `while` condition outside its loop can change reevaluation behavior. Multiline predicate assignments remain allowed.

## Deterministic enforcement

`scripts/quality/python/check_condition_layout.py` parses AST/tokens without importing or executing scanned files. It checks from each `if`/`elif` keyword through its terminating colon, including wrapped single-name conditions, multiline calls, explicit backslash continuations and multiline literals. Nested expression colons, comments, strings and UTF-8 column offsets are handled structurally.

`pnpm python:lint` scans service source/tests, the browser harness, its AST-only host tests and the convention tools. `pnpm python:check` and the existing Python GitHub Actions job inherit enforcement. No provider calls or sibling checkout are required. Exit 0 means compliant, 1 reports file/line violations and fails the job, and 2 indicates invalid input/syntax. Missing/empty targets fail closed. Ruff, strict Pyright and offline pytest cover the checker and its regression fixtures.

This is Ancora's explicit Python overlay. The existing TypeScript/JavaScript predicate policy is unchanged. The engineering-playbook checkout is a reading mirror; this change does not modify it.
