# 0007: Place Eval Runner Under Tools

## Status

Accepted

## Context

Ancora treats evals as first-class engineering artifacts. The repo needs a runnable eval boundary for retrieval, generation, grading, prompt comparison, and agent workflow smoke checks. The boundary should be close enough to application code to share schemas and provider adapters, but separate from production request serving.

## Decision

Place the eval runner under `tools/eval-runner`. Store eval datasets, rubrics, fixtures, and reports under `evals`. The eval runner is a TypeScript internal CLI and artifact boundary, not a deployable service or production API.

## Alternatives Considered

- Put eval execution scripts directly under `scripts`.
- Place eval execution under `services/eval-runner`.
- Hide eval execution inside the Next.js request-serving code.
- Keep evals as ad hoc notebooks or one-off local commands.

## Consequences

- Eval execution has a clear owner and can grow without becoming production request code or deployable service code.
- Prompt versions, schemas, model settings, and trace references can be tested against synthetic datasets.
- The `apps/web` server boundary can focus on product and AI runtime behavior while exposing reusable contracts.
- Eval datasets and reports must remain synthetic or explicitly approved and must not contain private source material.
