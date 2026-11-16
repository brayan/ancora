# Selected-attempt coaching

[ADR 0016](../adr/0016-persist-selected-attempt-coaching.md) owns this extension of [hints](progressive-hints.md) and [solution reveal](practice-assistance.md). Coaching concerns one completed saved attempt. Choosing another attempt never edits the draft or replaces the saved verdict.

## Sharing boundary

The learner chooses a saved attempt, reviews its exact code and clicks **Share this saved code with OpenAI**. Cancel performs no dispatch. Retry repeats the disclosure and affirmative action because it sends the source again. The UI identifies the selected attempt and configured model. The mutable editor is excluded, even if its content differs from the submitted snapshot.

Browser mutation contracts accept only a UUID request ID, saved attempt ID and literal `shareCode: true`; retry accepts the version and affirmative sharing flag. Next.js resolves the saved source and usable revision. No browser-provided code, evidence, model, readiness or assistance claims are accepted. The persisted request binds attempt/revision/source digest, `code-sharing-v1` and first sharing time; each dispatch has an append-only event timestamp. This is a local consent record, not authentication or proof of viewing.

Next.js sends a strict projection: the selected code, public statement/contract/requirements/examples and bounded execution status, passed/total counts and technique status. Reference code, hidden case values/IDs, current draft, other attempts, stdout, exception text and arbitrary report properties are excluded. Browser evidence is untrusted. API/provider input, output and errors must never enter application logs or traces. Provider `store=false` is a request setting, not a claim about all provider retention policies.

## Feedback and ownership

Feedback contains `summary`, one to four `observations`, and `nextStep`, each bounded to 900 UTF-16 units. The trusted response reader caps encoded JSON at 40000 bytes, accommodating escaping across all six possible text fields. Display text through React escaping. Blank/oversized/fenced/full-function output is withheld; deterministic checks cannot prove semantic correctness or prevent every spoiler. The versioned prompt treats code/comments/problem text as untrusted data, requests no tools, avoids repeating source and gives advice without an authoritative verdict. Feedback cannot rewrite the source, challenge, tests, result or reference-reveal state.

FastAPI uses a capability router, API Pydantic models/mappers, plain `CoachingCommand`/domain values, an application service/interface and an independent provider schema. No Pydantic enters core business logic, no Python database writer is added, and learner source is never executed on the host. Wire schemas live in `packages/schemas/src/coaching.ts` and generated `coaching-v1.schema.json`; API/provider parity and core import direction are offline checks.

## Durable lifecycle and assistance

One request per immutable attempt has `generating`, `ready`, `failed` or `interrupted` state. One initial dispatch plus at most one explicit retry is shared across tabs and IDs. Reads/polling/reload never dispatch. A reservation older than 120 seconds becomes interrupted and retains consumed allowance; late responses cannot replace terminal/newer outcomes. Accepted feedback, sharing identity and source digest are immutable; records cannot be deleted and events append only. Replaying dispatch two cannot spend a third allowance.

Completion takes the revision lock shared by attempt submission, hints and reveal. Future attempts snapshot `coachingAvailable` if any accepted feedback existed for that revision at submission. Pending/failed requests do not count. The original coached attempt links to its own feedback without rewriting its earlier assistance snapshot. Later feedback and idempotent submission replay cannot relabel older attempts. The flag means help was available, not attested use. Historical attempts default to no recorded coaching.

Reviewed history includes retained 0000–0004, reserved legacy 0005 and additive 0006–0009. Custom **0010** adds request records/guards and the attempt snapshot column. Prior SQL/snapshots/journal entries and existing volumes remain unchanged. Use the existing guarded migration command with an explicit `DATABASE_URL` after ledger review; no schema push, destructive diff, reset or automatic startup migration. Tests migrate disposable databases, including upgrades from 0006/0007/0008/0009.

## Local operation and validation

Set `PRACTICE_COACHING_ENABLED=1` independently in Python with the existing key, model and shared service token. Other capabilities do not enable coaching. All SDK/framework/transport retries are disabled, with one typed dispatch and no tools. Credentials/settings stay out of the web/runner child environments. Existing Host/Origin and server-token boundaries protect paid routes; runner messages never authorize coaching.

| Boundary | Operation |
|---|---|
| Next.js `GET /api/practice/coaching?attemptId=…` | Read saved feedback/availability and recover stale reservations without sending source. |
| Next.js `POST /api/practice/coaching` | Initial request `{apiVersion, id, attemptId, shareCode: true}`. |
| Next.js `POST /api/practice/coaching/{coachingId}/retry` | Explicit sharing/retry `{apiVersion, shareCode: true}`. |
| FastAPI `GET /v1/coaching/status` | Configuration only; no provider probe. |
| FastAPI `POST /v1/coaching` | Trusted-server-only bounded source-sharing dispatch. |

CI uses synthetic code/providers, mocked SDK transports and disposable PostgreSQL; no provider credentials or paid calls. Synthetic evaluation cases and rubric are in `evals/programming-practice/coaching-v1.synthetic.json`. Earlier hint/generation budgets do not authorize coaching evaluation. Manual quality evaluation remains deferred until a separate model/total budget and full-output owner review; offline software results are not quality acceptance.

Review ADR 0016 first, then contracts/migration, lifecycle/provider, sharing UI and regression coverage. Complete paginated history and editor enhancements remain separate.

## Verified local result

- `pnpm repo:test:pr` passed conventions/formatting, generated-contract drift, shared/web/eval TypeScript, Compose, 16 quality fixtures, 33 web unit cases, 48 disposable-PostgreSQL cases and eval scaffold checks. The scaffold is not a model-quality evaluation.
- `pnpm python:check` passed Ruff lint/format, strict Pyright and 195 offline tests, including inward imports, site-packages-disabled core imports, wire parity and one-dispatch mocked provider failures.
- The complete `pnpm web:test:browser` suite passed 53 tests in installed Google Chrome. After refining the coaching response-byte bound, all five coaching browser cases passed again. Sharing/cancel, exact saved-code projection, reload during generation, disabled-provider saved feedback, retry disclosure/exhaustion and previous assistance/generation/runner regressions are covered. Failure/availability UI projections are explicitly synthetic; real lifecycle transitions use PostgreSQL.
- Desktop/mobile feedback captures were inspected; keyboard focus, 390px overflow and normal-flow console/network checks passed. Synthetic captures remain ignored under `apps/web/test-results/coaching-{desktop,mobile}.png`.
- All 14 retained SQL/snapshot files and prior journal entries are unchanged. Only disposable databases were migrated; manifests/locks and existing offline GitHub Actions are unchanged. No dependencies, paid calls, commit, push or PR publication belong to this implementation task.

Manual live coaching quality remains unmeasured and requires separate authorization. Software checks establish bounded behavior, not semantic quality, spoiler freedom or attested assistance use. Existing databases still require deliberate ledger-reviewed migration 0010 before using this feature.
