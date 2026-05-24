# Eval Strategy

## Status Summary

| Status | Scope |
|---|---|
| Implemented | Evals are a first-class repo boundary with `tools/eval-runner`, `evals`, prompts, schemas, and ADR guidance. |
| In progress | TypeScript eval runner scaffold and portfolio eval strategy documentation. |
| Planned | Deterministic smoke evals, citation checks, RAG comparison evals, answer grading evals, report-only quality evals, and artifact sanitation checks. |
| Deferred | Non-synthetic eval datasets, production user data evals, large benchmark suites, and external judge provider routing. |

## Eval Principles

- Eval inputs must be synthetic or explicitly approved sample material.
- Reports should use source IDs, chunk IDs, prompt versions, scores, and trace references instead of raw private source text.
- Deterministic checks should gate regressions before subjective quality scores do.
- Report-only evals can inform decisions before they become blocking checks.
- Every prompt or retrieval change should identify which evals need to move with it.

## Deterministic Smoke Evals

| Status | Expected Checks |
|---|---|
| Planned | Source chunk IDs are preserved through retrieval and generation. |
| Planned | Required citations exist for grounded answers and generated cards. |
| Planned | Retrieval excludes chunks from other accounts. |
| Planned | Known synthetic questions retrieve expected synthetic chunks. |
| Planned | Structured outputs pass schema validation. |
| Planned | Reports omit raw private source text and secrets. |

Smoke evals should be small enough to run locally and in CI.

## Report-Only Quality Evals

Quality evals can be report-only until the scoring rubric is stable. They should capture:

- Grounding strength.
- Citation usefulness.
- Answer correctness against synthetic references.
- Flashcard clarity and difficulty.
- Hallucination or unsupported claims.
- Refusal behavior when source evidence is insufficient.
- Cost and latency per workflow.

## Citation Checks

Citation checks should answer concrete questions:

- Does every grounded answer cite at least one source chunk?
- Do cited chunk IDs belong to the requesting account?
- Does the answer avoid claims not supported by retrieved chunks?
- Are citations attached to generated card versions, not only transient responses?
- Does the UI have enough citation metadata to explain source provenance without exposing unnecessary private text?

## RAG Comparison Evals

RAG comparison evals should compare changes in retrieval behavior before replacing the simple baseline.

| Comparison | Status |
|---|---|
| Direct pgvector retrieval vs tuned query construction | Planned |
| Top-k settings and score thresholds | Planned |
| Chunk size and overlap strategies | Planned |
| Reranking or LangChain.js abstractions | Deferred until baseline evidence exists |
| Dedicated vector database | Deferred until pgvector limits are demonstrated |

## Answer Grading Evals

Answer grading evals should stay tied to learner outcomes:

- Correctness against synthetic source facts.
- Completeness for the learner's question.
- Citation support.
- Clarity and study usefulness.
- Appropriate uncertainty when evidence is missing.
- Safe handling of prompt-injection attempts in source text.

Model-graded evals should be labeled as report-only until rubric reliability is reviewed.

## Artifact Sanitation

Every eval artifact should be safe to commit. Sanitation checks should reject:

- Real private source text.
- Secrets or API keys.
- Raw provider payloads that include private content.
- Trace exports with unredacted prompts or completions.
- Screenshots containing private material.
- Non-synthetic datasets unless explicitly approved and documented.

## Eval Handoff Expectations

Future implementation prompts that change retrieval, prompts, generation, grading, or workflow orchestration should update this strategy or explain why it does not apply. Handoffs should report eval commands run, missing commands, and whether failures are product regressions or expected report-only findings.
