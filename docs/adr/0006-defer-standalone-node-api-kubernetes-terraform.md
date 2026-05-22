# 0006: Defer Standalone Node API, Kubernetes, Terraform, Redis, PyTorch, and File Ingestion

## Status

Accepted

## Context

Ancora's main risk is delivering a useful, observable, evaluated AI learning loop. Extra platform layers and ML experiments can distract from the core vertical slice. The project plan identifies Node.js, Kubernetes, Terraform, Redis, PyTorch, and advanced ingestion as later additions.

## Decision

Defer a standalone Node API, Kubernetes, Terraform, Redis, PyTorch, and uploaded file ingestion until the core vertical slice works. The v1 source path starts with pasted or otherwise directly supplied text. Docker Compose remains the local environment target.

## Alternatives Considered

- Adding Kubernetes and Terraform from the start.
- Splitting product API ownership between Node and FastAPI in v1.
- Adding Redis queues before proving worker needs.
- Supporting PDFs and uploaded files before pasted text works.
- Adding PyTorch-based ranking or difficulty prediction early.

## Consequences

- The first implementation stays focused on auth, account-scoped sources, chunking, embeddings, RAG tutoring, grounded card generation, review, tracing, and eval smoke checks.
- Workers can start with simple Python execution paths and add queues later if needed.
- Infrastructure remains local and reviewable.
- Any move into deferred technologies requires an ADR that explains the need and migration path.
