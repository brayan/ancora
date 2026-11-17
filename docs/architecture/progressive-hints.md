# Progressive hints

[ADR 0015](../adr/0015-persist-bounded-progressive-hints.md) owns this extension of [solution reveal](practice-assistance.md). Coaching remains separate. Each immutable challenge revision supports three requested levels: conceptual nudge, approach, then language-neutral pseudocode. A later level unlocks only after the previous level is ready.

## Boundary and content

Next.js resolves the saved usable revision and constructs a strict public projection: title, objective, statement, structured function contract, requirements, technique and public examples. Earlier accepted hints accompany the requested level. Browser callers can supply only a request ID, revision and level; they cannot provide context, provider settings, readiness, dispatch counts or assistance claims. Drafts, attempts, reference source and hidden cases never enter the hint request.

FastAPI exposes capability-specific hint routes, the plain `GenerateHint` use case, the `HintProvider` interface and domain validation in `hint_validation.py`. API Pydantic models map to the core; independent infrastructure Pydantic models bound OpenAI output. The prompt is `programming-hints-v1`; the canonical runtime/wire schemas are in `packages/schemas/src/hints.ts` and `hints-v1.schema.json`. Output contains only level/content; adapter-owned model/prompt/schema provenance is persisted alongside it. No Python execution or database writer is added.

Hints render as text. Empty, oversized, mismatched-level, verbatim repeated, fenced or obvious full-function output is withheld. These checks cannot prove useful progression, semantic correctness or freedom from every possible spoiler; manual output review remains separate evidence. The full reference remains an explicit reveal action. A hint cannot change the draft, revision, cases, result or verdict.

## Durable lifecycle

`practice_hint_requests` has one row per revision/level and a stable UUID request identity. Its states are `generating`, `ready`, `failed` and `interrupted`. At most two provider dispatches are permitted: initial and one explicit retry. Append-only metadata events retain each dispatch/outcome; identities, allowance and accepted output cannot be rewritten or deleted. A new ID for an already requested level returns its existing record. Reusing a stored ID for a different level/revision is a conflict; a fresh ID for an already requested level resolves to the canonical stored ID.

Next.js reserves before dispatch. Python allows one provider call, no tools and no SDK/framework/transport retries. Reads, refreshes and polling never dispatch. Closing a tab does not discard the durable request. Reopening reads it; a reservation older than 120 seconds becomes interrupted. Unknown outcomes retain the used dispatch. Retrying a lost second-dispatch response only reads its current state. Late responses cannot replace a terminal outcome or newer dispatch.

Hint completion shares the immutable revision's row lock with attempt submission and reference reveal. A new attempt snapshots the highest ready hint level as `hintLevel`; pending/failed hints do not count. Later hints and idempotent submission retries cannot change old snapshots. The label means recorded assistance was available, not attested viewing. Existing attempts have zero recorded hints because historical hint usage was not collected.

## Storage and local operation

Migration history was reviewed through 0008, including the reserved legacy 0005 and guarded ledger. Custom additive migration 0009 adds hint records and the attempt snapshot column. Preserve prior SQL/snapshots/journal entries and existing volumes. No schema push, destructive diff, reset or automatic startup migration is used. Tests use disposable PostgreSQL, including upgrades from 0006, 0007 and 0008.

Enable hints separately with `PRACTICE_HINTS_ENABLED=1` in the Python environment, plus the existing model, key and shared service token. Generation-only configuration does not opt into hints. The Python hint status endpoint reads configuration without contacting OpenAI. Saved hints remain readable when generation is disabled. The app/runner's exact Host/Origin and token boundaries remain in place. SDK tracing/access logging remains off; request/code/provider text never enters logs or committed evidence.

| Boundary | Operation |
|---|---|
| Next.js `GET /api/practice/hints?revisionId=…` | Read saved hints and configured availability; recover stale reservations without paid dispatch. |
| Next.js `POST /api/practice/hints` | Idempotent initial request `{apiVersion, id, revisionId, level}`. |
| Next.js `POST /api/practice/hints/{hintId}/retry` | Explicit retry `{apiVersion}` within the same two-dispatch allowance. |
| FastAPI `GET /v1/hints/status` | Server-token-only availability; no provider request. |
| FastAPI `POST /v1/hints` | One bounded server-token-only hint dispatch; no browser Origin. |

## Evaluation

CI and automated checks use typed fakes, mock transports, synthetic fixtures and disposable databases, with no provider credentials or paid calls. `hints-v1.synthetic.json` contains public-only list, string and dictionary cases plus the progression rubric. They are evaluation inputs, not a production challenge bank.

The owner separately authorized manual `gpt-6-luna` evaluation capped at USD 1 total for this slice. Live outputs, the spending ledger and review evidence remain outside Git. Software checks and owner acceptance of complete hint sequences are recorded separately; no live-quality claim follows from a synthetic pass.

## Verified result

- `pnpm repo:test:pr` passed conventions/formatting, contract drift, TypeScript, Compose, 16 quality fixtures, 26 web unit cases, 38 disposable-PostgreSQL cases and eval scaffold checks.
- `pnpm python:check` passed Ruff lint/format, strict Pyright and 166 offline tests, including core import direction, API/provider schema parity and one-dispatch transport failures.
- `pnpm web:test:browser` passed 48 tests in installed Google Chrome, including seven hint scenarios plus generation, persistence, reveal and runner regressions. Desktop/mobile hint captures were inspected; keyboard focus, 390px overflow and normal-flow console/network checks passed. Failure projections are explicitly synthetic; real lifecycle/immutability checks use PostgreSQL.
- The owner accepted all three final live hint sequences for list filtering, string normalization and dictionary filtering. Two manual passes made 18 total `gpt-6-luna` calls with no unknown outcomes. Conservative ledger accounting is USD 0.015208 against the separate USD 1 cap, not an invoice. The first pass exposed unnecessary type validation and weak pseudocode progression; the final prompt/rubric explicitly preserve the valid-input domain and require structured pseudocode steps. Live outputs were not copied into fixtures or commits.
- All 13 retained SQL/snapshot files and prior journal entries remain unchanged. Fresh, known-legacy and 0006/0007/0008 upgrades passed on disposable databases. Existing databases were neither migrated nor reset, and no dependencies changed.

These are local results; hosted CI is not claimed. Synthetic captures remain ignored under `web/test-results/hints-{desktop,mobile}.png`. Review ADR 0015 and these boundaries first, then contracts/migration, durable lifecycle, Python service, UI and regressions. Coaching was subsequently implemented under [ADR 0016](../adr/0016-persist-selected-attempt-coaching.md); [v1 completion](../testing/v1-completion.md) records current verification.
