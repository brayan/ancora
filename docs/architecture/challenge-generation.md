# Challenge generation

ADR 0013 implements the bounded service ownership selected in ADR 0011. The LLM creates complete new problems, requirements, constraints, examples, reference code and candidate evaluation cases. Production never chooses from the synthetic test fixtures.

## Lifecycle and ownership

Next.js records an idempotent Generation request before its first dispatch. Concurrent retries with the same ID cannot dispatch again; a mismatched request is rejected. One correction/recovery is an explicit action on a failed or interrupted generation. Both reservations share a durable maximum of two. Outcome events preserve started, invalid, interrupted, candidate and validation decisions without logging source. Python makes at most one provider request per service call.

FastAPI validates strict typed input/model output, function AST and case/contract consistency. It neither executes solutions nor connects to PostgreSQL. Transport, SDK and Pydantic AI retries are disabled, with one-request usage limits. Failures expose bounded machine codes, not raw provider errors or prompts. Model output cannot set identities, privileges or readiness.

[ADR 0014](../adr/0014-layer-generation-around-a-framework-free-core.md) defines the Python internals: capability routers and strict Pydantic HTTP schemas under `api/`; a plain-model `ChallengeGenerationService` and application-owned `ChallengeGenerationProvider` interface; framework-free challenge models/rules under `domain/challenges/`; and separate provider schemas/mappers plus `OpenAIChallengeProvider` under `infrastructure/llm/`. Bootstrap owns concrete resources. The API translates errors and enforces transport bounds; the service dispatches once and applies domain consistency rules. No Pydantic or SDK reaches the core, and no Python repository/database writer is introduced.

An accepted structural draft becomes a new immutable revision. A separate candidate record binds its reference job, revision, source/case digests and runtime. The browser executes the reference in the isolated runner and submits bounded data. Exact reports are replayable; changed reports and stale revision/job bindings are rejected. Stop/bootstrap/context interruptions leave checking pending; timeout/output-limit/behavior/technique failures allow an explicit correction or final rejection. Reports never authorize that correction call.

Closing the tab leaves a saved candidate pending. Reopening reads the same job and offers Resume validation; it does not regenerate. Lost validation responses retain a separate recovery record for retry. A provider reservation still marked generating after its bounded wait becomes interrupted, not automatically retried. Late responses cannot replace a newer dispatch.

## Content, revisions and drafts

Generated functions take one named argument. Supported types: `int`, `str`, `list[int]`, `list[str]`, `dict[str,int]`, `dict[str,str]`. Booleans are excluded from integers; magnitude is bounded at 1,000,000. Strings are bounded at 2,000 JavaScript UTF-16 units, collections at 100 entries and dictionary keys at 100 units. Cases use explicit JSON-string encoding at the model boundary, then typed values for execution. No external packages, interactive input, arbitrary nested values or host execution are introduced.

Signature/starter code derive from the contract. Model-proposed expectations retain that provenance. Reference/test agreement establishes internal consistency, not independent correctness of the natural-language problem. Unsupported technique patterns remain inconclusive. The runner's capability and memory limits remain those documented in the [runner spike](runner-spike.md).

Dictionary behavior checks compare both entries and their order, including order-only input mutations. Generated case maps are reconstructed from immutable JSON strings after storage because PostgreSQL JSONB normalizes object keys. Version 2 reports are likewise stored as validated JSON strings inside the existing JSONB column, restored before product projection and compared with dictionary order on replay. Version 1 records remain readable unchanged. The wire uses JavaScript property enumeration order: numeric-index keys are normalized before Python receives them. This encoding cannot represent every arbitrary Python dictionary insertion order. Version 2 case digests preserve the resulting dictionary data order while canonicalizing contract metadata; version 1 remains unchanged.

Generation leaves the current exercise and draft open. A ready challenge requires an explicit Open action, after saving current edits. Each tab retains its selected revision across refreshes and reloads. Each revision has its own draft and attempt history. Normal session views omit reference code, hidden cases, generation drafts and private validation metadata. Runner envelopes remain inspectable by the local owner. The selector includes fixed practice, the tab's current revision and recent ready challenges, capped at 20. Full generated-challenge history remains a later slice; older records are retained.

## Migration review and privacy

Migration 0007 only adds generation/candidate/active-selection tables and candidate immutability protection. All prior SQL, snapshots and ledger entries are retained. The existing preflight/advisory-lock owner applies custom additive migrations; schema push/diff generation remains unavailable. Tests replay fresh history and upgrade a synthetic 0006 database with saved drafts/attempts. Existing volumes and the legacy checkout are not reset or migrated by tests.

The service binds loopback 8001, requires a server-only bearer token and rejects browser Origin requests. Next.js browser mutations retain exact Host/Origin and bounded JSON checks. Provider credentials reach only the Python process; the static runner receives neither database nor service/provider credentials. Prompts, reference/submitted source, credentials and raw provider failures do not enter logs, traces or CI artifacts. Generation sends explicit choices and bounded recent exercise titles, never the learner solution.

GitHub Actions uses locked dependencies and synthetic provider/database fixtures. See [CI](../engineering/continuous-integration.md). The owner authorized a separate gpt-6-luna pilot capped at USD 1 total. This does not authorize provider use in CI; live results and remaining budget are recorded separately.
