# ADR 0016: Persist selected-attempt coaching

Status: Accepted within the owner's selected-attempt coaching request.

Date: 2026-11-15

## Decision

Coaching is requested for one saved attempt, never the mutable editor. Before each initial or retry dispatch, show the exact saved source and require an explicit action confirming its transmission to OpenAI. Browser requests contain an attempt ID and affirmative sharing confirmation; Next.js resolves the immutable source, digest and usable revision. Persist the first confirmation version/time and source digest with the coaching request. This is a local product consent record, not authenticated user attestation.

Next.js owns persistence, request identity and one initial dispatch plus at most one explicit retry per attempt. Concurrent/replayed actions return the canonical request. Reads, polling and reloads never dispatch; stale reservations become interrupted without restoring allowance. Late responses cannot overwrite terminal or newer outcomes. Accepted feedback and sharing identity are immutable, with append-only dispatch metadata. FastAPI performs one typed provider call through an application service/interface, preserving ADR 0014's plain core and independent Pydantic boundaries.

Share only the selected source, public challenge context and a bounded aggregate execution summary. Never share the current draft, other attempts, reference source, hidden case values, stdout, exception text or arbitrary stored report fields. Reports remain untrusted self-study evidence. Feedback contains a summary, observations and one next step, never an authoritative verdict or replacement solution. Display as text; reject blank/oversized/fenced/full-function output. These checks do not prove semantic quality or absence of every possible spoiler. Coaching cannot change code, tests or verdicts.

One durable request per immutable attempt is sufficient initially. Add migration 0010 after reviewing retained history through 0009, including reserved legacy 0005; preserve all prior SQL/snapshots and volumes. Completion shares the revision lock used by submission/reveal/hints. Future attempts snapshot whether accepted coaching was available for that revision; old attempts are never rewritten. The source attempt is linked to its own feedback separately. Historical attempts default to no recorded coaching; the field does not attest viewing.

Enable coaching separately with `PRACTICE_COACHING_ENABLED=1` in Python. Keys/model remain server-only; no runner privileges, Python database writer, new dependency or execution boundary is introduced. SDK/framework/transport retries stay disabled. CI and browser tests use synthetic code/providers and disposable PostgreSQL. No live evaluation is authorized by prior generation/hint budgets; manual quality evaluation remains pending a separately selected model/budget and owner acceptance.
