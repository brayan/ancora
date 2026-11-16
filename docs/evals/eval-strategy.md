# Programming Practice Eval Strategy

ADRs 0011–0016 define concept-generated Python practice and requested assistance. Challenges have no fabricated Source/Chunk/citation lineage. Retired source/RAG/flashcard features are not current evaluation targets.

## Evidence boundaries

| Evidence | What it establishes |
|---|---|
| Offline Python/schema/provider tests | Structural consistency, mapping, bounded dispatches, safe errors and framework-free layering. |
| Disposable PostgreSQL integration | Immutable records, upgrade preservation, concurrency, recovery and assistance ordering. |
| Actual Chrome/Pyodide tests | Supported execution behavior, cancellation/reset, message/capability boundaries and UI flows. |
| `pnpm eval:smoke` | Deterministic metadata from an empty scaffold; no exercise-quality score or execution coverage. |
| Separately authorized live review | Clarity, semantics, difficulty, progression and solution disclosure for the reviewed samples. |

Reference/test agreement is internal consistency, not independent semantic correctness. Browser reports are untrusted self-study evidence, not hostile-code attestation. Automated provider tests use typed fakes or mocked transports; no paid call belongs in CI.

## Versioned synthetic material

[Programming-practice evals](../../evals/programming-practice/README.md) own generation, hint and coaching inputs/rubrics. [Prompts](../../prompts) own versioned instructions; [schemas](../../packages/schemas/README.md) own wire artifacts. Authored synthetic exercises are test inputs, never the production challenge bank.

- Generation: statement/contract agreement, finite inputs, empty/boundary/duplicate/order/mutation cases, varied function names/types, candidate rejection and explicit correction.
- Hints: public-only context, progression, faithfulness and bounded disclosure; exclude learner/reference source and hidden cases.
- Coaching: one explicitly shared synthetic saved attempt, public context and bounded aggregate evidence; advisory output cannot alter code/tests/verdicts. Check semantic accuracy, useful next steps and spoiler/source repetition separately from output shape.

Host tests may inspect solution ASTs but never execute solutions. Execution belongs only to the isolated browser runner.

## Live evaluation and acceptance

Generation and hint pilots had separate approved models/budgets and sample acceptance, recorded in the [generation plan](../exec-plans/challenge-generation.md) and [hint evidence](../architecture/progressive-hints.md). Reviewed samples do not prove all future outputs correct.

Live coaching evaluation is explicitly deferred in v1 completion. A later run needs a new exact model ID, maximum total budget and owner review of complete feedback. Do not reuse earlier budgets, infer quality from offline tests or treat model scores as human acceptance. CI stays offline regardless of future manual evaluations.

## Artifact privacy

Use synthetic or explicitly approved inputs. Keep private material, real submitted source, credentials, raw provider payloads and prompt/completion traces out of fixtures, commits, screenshots and reports. Record bounded IDs, digests, versions, counts and measured usage/durations when available; missing measurements remain unknown. Private review outputs belong only in an explicitly authorized location outside Git.

Prompt/schema/provider changes must identify affected cases/checks. [V1 completion evidence](../testing/v1-completion.md) records current software validation and limits.
