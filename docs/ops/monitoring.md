# Monitoring

## Status Summary

| Status | Scope |
|---|---|
| Implemented | Observability is documented as a first-class concern and `infra/observability` exists as a placeholder boundary. |
| In progress | Monitoring narrative defines planned signals and privacy boundaries. |
| Planned | Langfuse JS/TS traces, OpenTelemetry app signals, Grafana/Prometheus dashboards, product metrics, latency, token use, and cost estimates. |
| Deferred | Production SLO automation, paging, long-term retention policy, and enterprise compliance reporting. |

## Monitoring Goals

Ancora monitoring should help answer:

- Are learners able to create sources and study artifacts successfully?
- Are grounded workflows returning cited, source-supported outputs?
- Are provider calls slow, failing, malformed, or unexpectedly expensive?
- Are eval scores moving after prompt, retrieval, or model changes?
- Are privacy rules being preserved in logs, traces, reports, and dashboards?

## Planned Signals

| Signal | Status | Notes |
|---|---|---|
| Product workflow events | Planned | Source created, card generated, tutor answer returned, review completed, eval run created. |
| LLM latency | Planned | Provider, model, prompt version, route, and workflow step. |
| Token and cost estimates | Planned | Input tokens, output tokens, embedding tokens, retry count, and estimated cost. |
| Retrieval quality | Planned | Top-k count, score range, cited chunk IDs, empty retrieval rate, and insufficient-evidence rate. |
| Structured output failures | Planned | Schema parse errors, retry outcomes, and fallback states. |
| Auth/account failures | Planned | Access denied counts without exposing private source text. |
| Eval outcomes | Planned | Smoke pass/fail, report-only grades, prompt version, dataset version, and trace references. |

## Langfuse

Langfuse JS/TS is the planned LLM observability tool. Langfuse traces should record prompt version, model, latency, token counts, cost estimate, source IDs, chunk IDs, card IDs, deck IDs, eval run IDs, and trace references where applicable.

Langfuse traces must not store raw private source material by default. If a future workflow needs raw prompt capture for debugging, it requires explicit privacy review and should use synthetic or approved sample material.

## OpenTelemetry, Grafana, and Prometheus

OpenTelemetry is planned for application-level traces and metrics that are not specific to LLM behavior. Grafana and Prometheus are planned for local or future production dashboards once metrics exist.

Planned dashboard groups:

- Product workflow success and failure rates.
- API/server latency.
- LLM provider latency and error rates.
- Token and cost estimates by workflow.
- Retrieval empty-result and citation-missing rates.
- Eval smoke trends and report-only quality scores.

## Product Metrics

Product metrics should focus on learning workflow health, not vanity totals:

- Sources created per account.
- Cards generated and edited.
- Tutor questions with cited answers.
- Review completion and retry rates.
- Regeneration rate after bad outputs.
- Insufficient-evidence responses.
- Eval failures tied to prompt versions.

## Privacy Boundaries

Monitoring data must use privacy-safe identifiers whenever possible:

- Account IDs, user IDs, source IDs, chunk IDs, deck IDs, card IDs, prompt versions, eval run IDs, and trace references.
- No real private source text in logs, traces, screenshots, dashboards, or reports.
- No secrets, API keys, raw provider payloads, or unredacted prompts in committed artifacts.
- Synthetic examples only in docs and eval fixtures.
