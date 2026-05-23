# 0010: Defer Python Runtime to Later Research and Tooling

## Status

Accepted

## Context

The earlier scaffold introduced Python runtime placeholders for product API, AI API, workers, and eval execution. ADR 0009 moves v1 product and AI runtime ownership to Next.js/Node/TypeScript.

Python may still be useful later for research notebooks, offline analysis, data science experiments, or one-off tooling. It should not remain as a v1 request-serving or worker runtime by default.

## Decision

Defer Python runtime services and workers until a later ADR approves them. The v1 runtime does not include a Python product API, Python AI service, or Python worker service.

Python tooling may be added later only when the task is explicitly research/tooling-oriented, keeps private source material out of generated artifacts, and does not create a production runtime boundary without an ADR.

## Alternatives Considered

- Keep placeholder Python services while routing new work to TypeScript.
- Convert only the product API and keep Python workers in v1.
- Ban Python from the repository entirely.

## Consequences

- Removed Python placeholders should not be used as routing targets for future v1 work.
- Eval smoke checks use the TypeScript eval-runner scaffold.
- Later Python adoption needs a clear owner, command surface, privacy posture, and validation story.
