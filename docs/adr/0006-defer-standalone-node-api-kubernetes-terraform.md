# 0006: Defer Separate Backend Microservices, Kubernetes, Terraform, Redis, PyTorch, and File Ingestion

## Status

Accepted

## Context

Ancora's main risk is delivering a useful, observable, evaluated AI learning loop. Extra platform layers and ML experiments can distract from the core vertical slice. ADR 0009 makes Next.js/Node/TypeScript the v1 product and AI runtime, so the deferred backend scope is now separate NestJS, Express, Python, or other independently deployed runtime services.

## Decision

Defer separate NestJS or Express microservices, Python runtime services, Kubernetes, Terraform, Redis, PyTorch, and uploaded file ingestion until the core vertical slice works and an ADR justifies the added boundary. The v1 source path starts with pasted or otherwise directly supplied text. Docker Compose remains the local environment target.

## Alternatives Considered

- Adding Kubernetes and Terraform from the start.
- Splitting product API ownership across the Next.js app and a second backend service in v1.
- Adding Redis queues before proving worker needs.
- Supporting PDFs and uploaded files before pasted text works.
- Adding PyTorch-based ranking or difficulty prediction early.

## Consequences

- The first implementation stays focused on auth, account-scoped sources, chunking, embeddings, RAG tutoring, grounded card generation, review, tracing, and eval smoke checks.
- Background execution starts inside the TypeScript-first product boundary unless a later ADR adds a separate worker runtime or queue.
- Infrastructure remains local and reviewable.
- Any move into deferred technologies requires an ADR that explains the need and migration path.
