# Programming Practice

## Goal and current scope

Choose a concept/difficulty, receive a generated Python challenge, implement one pure function, run examples, check behavior/technique and optionally request help. This replaces the earlier account/source/flashcard product direction (ADR 0011).

The implementation includes concept/difficulty selection, bounded generation, reference validation, explicit challenge opening, a plain editor, PostgreSQL-backed drafts, exact submitted attempts, immutable revisions and reload/resume. The fixed synthetic exercise remains available. Recent attempts and ready challenges can be opened without discarding drafts. Coaching is deferred. No login is required. Difficulty and duration are targets, not measurements.

## Execution contract

One named function; valid finite JSON-like inputs/outputs; bounded integers excluding booleans, strings, lists and string-keyed dictionaries. Signature and stub derive from a structured contract. Specify ordering, duplicates, mutation, value/size/depth bounds and expected-result provenance. No interactive input, third-party packages or automatic import-based package loading. Cases are data; the application owns the harness.

Example: `positive_even(values: list[int]) -> list[int]` returns a new list of positive even integers using a list comprehension, preserving order and duplicates without mutating input. Zero is excluded. Type validation is outside the exercise.

## Records and learner view

Next.js owns Generation, Challenge/Revision, Draft, Attempt and Assistance. Each accepted revision records prompt/schema/model/runtime/validator versions and validation provenance. Attempts preserve exact source and assistance used. No account IDs or artificial Sources are required.

Normal learner projections omit reference code and unrevealed cases, including HTTP/RSC payloads. Browser runner envelopes can contain evaluation material; it is inspectable by the machine's owner. Coaching/reveal never alters the challenge, cases or verdict.

## Generation and recovery

Generate a full draft, validate structure/cross-field agreement, persist a candidate, then run reference checks in the isolated runner. Next.js alone changes lifecycle state. Failed correction creates another revision. At most two provider dispatches total per generation, including framework/SDK/transport attempts. Closing a tab leaves the saved candidate pending; reopening resumes it. An uncertain paid call is marked interrupted/unknown and never silently repeated. Runner failure reports do not authorize paid correction.

## Interaction requirements

Concept/difficulty, generate, statement/contract/examples, editor, run examples, check, Stop, separate behavior/technique results, explicit reference reveal and history. Preserve drafts across errors/reload and before changing exercise. Optional hints/coaching and CodeMirror remain later enhancements. AI completion defaults off. No marketing page, leaderboards, collaboration or arbitrary package installation.
