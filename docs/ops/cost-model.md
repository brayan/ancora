# Cost Model

## Status Summary

| Status | Scope |
|---|---|
| Implemented | Cost is identified as an operational concern, and the auth/database foundation defines the first baseline hosting assumptions. |
| In progress | Initial estimation framework for common workflows. |
| Planned | Token measurement, provider pricing assumptions, budget guardrails, eval cost reports, and dashboard metrics. |
| Deferred | Billing, paid plans, enterprise quotas, provider arbitrage, and automated model routing. |

## Cost Principles

- Track cost by workflow, prompt version, model, account, and trace reference where safe.
- Separate embedding cost from generation cost.
- Record token counts and pricing assumptions used for each report.
- Do not hardcode provider pricing into docs as permanent truth; provider prices change and should be checked against official pricing before cost claims are published.
- Use synthetic examples for demos and evals.

## Estimation Formula

For each workflow:

```txt
estimated_cost =
  embedding_input_tokens * embedding_price_per_token
  + llm_input_tokens * input_price_per_token
  + llm_output_tokens * output_price_per_token
  + retry_cost
```

Reports should include the model names, pricing date, token counts, retry counts, and assumptions.

## Baseline Hosting Assumptions

The implemented auth/database foundation adds non-LLM baseline costs before AI workflows exist:

- A PostgreSQL database with pgvector is required for accounts, users, source/chunk foundations, and trace references.
- Auth.js credentials auth itself does not add provider cost, but production needs secret management and database-backed user/account records.
- Source text and chunk storage costs depend on future ingestion limits; no real or private source data is committed for demos or tests.
- Vector index tuning and storage growth remain planned because retrieval behavior is not implemented yet.

## Workflow Cost Drivers

| Workflow | Status | Primary Cost Drivers | Guardrails |
|---|---|---|---|
| Source ingestion | Planned | Source length, chunk count, embedding model, duplicate detection. | Source size limits, chunk caps, deduplication, and batch controls. |
| Tutor question | Planned | Retrieved chunk count, prompt length, model, answer length, retries. | Top-k limits, answer length caps, insufficient-evidence fallback. |
| Flashcard generation | Planned | Number of cards, retrieved context, structured output retries. | Card count limits, schema validation, review-needed state. |
| Study session | Planned | Number of explanations, grading calls, hints, and adaptive prompts. | Per-session budget, cached card content, bounded hints. |
| Demo/monthly usage | Planned | Synthetic sources, scripted workflows, eval runs, provider model choice. | Demo budgets, smoke eval caps, report-only quality runs. |

## Initial Reporting Shape

Cost reports should be privacy-safe and inspectable:

| Field | Example Shape |
|---|---|
| `workflow` | `tutor-question` |
| `account_id` | synthetic or internal ID |
| `source_ids` | list of source IDs, not source text |
| `chunk_ids` | list of chunk IDs, not chunk text |
| `prompt_version` | `tutor-answer@v1` |
| `model` | configured model name |
| `input_tokens` | measured integer |
| `output_tokens` | measured integer |
| `embedding_tokens` | measured integer |
| `retry_count` | measured integer |
| `estimated_cost` | calculated value using recorded assumptions |
| `trace_reference` | trace ID or URL reference without raw private content |

## Demo and Monthly Usage Scenarios

The first portfolio cost model should compare:

- Small demo: one synthetic source, a few tutor questions, one flashcard generation run, and one smoke eval.
- Weekly learner: several pasted sources, recurring tutor questions, card generation, and study reviews.
- Eval-heavy development: repeated prompt and retrieval changes with smoke and report-only evals.

Each scenario should state assumptions rather than claiming exact production cost before measurement exists.

## Cost Spike Risks

| Risk | Status | Mitigation |
|---|---|---|
| Very long pasted source | Planned | Source length limits and chunking budget. |
| Excessive retrieved context | Planned | Top-k and token budget limits. |
| Structured output retry loop | Planned | Bounded retries and fail-safe review state. |
| Model upgrade cost change | Planned | Explicit pricing assumption and human review. |
| Eval suite expansion | Planned | Separate smoke gates from report-only quality runs. |
| Provider outage retries | Planned | Retry budget and user-visible fallback. |
