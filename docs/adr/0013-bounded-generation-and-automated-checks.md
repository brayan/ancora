# 0013: Bounded Generation and Automated Checks

## Status

Accepted within the owner's challenge-generation-plus-CI request on 2026-11-14.

## Decision

Implement ADR 0011's Python generation boundary with FastAPI and Pydantic AI. Next.js remains the sole durable-state owner. A generation reserves its initial provider dispatch before network access and permits only one explicit correction/recovery dispatch. Python SDK, framework and transport retries are disabled. Unknown outcomes consume the reservation and never cause a silent paid retry.

Append migration 0007 after the retained 0006. Generations keep bounded outcome events; each candidate has a new immutable revision and bound reference-validation job. Infrastructure interruptions leave validation resumable. A terminal result is recorded once, with duplicate replay idempotent. Browser reports can update self-study readiness but cannot dispatch a provider request.

The first generated contract supports one named argument with bounded integers, strings, homogeneous lists or string-keyed dictionaries. Signature and starter code derive from structured data. Model cases encode values as JSON strings before typed validation. Runner protocol v2 binds that contract to the cases; v1 remains supported for fixed practice and historical attempts.

Only a verified-ready revision can become active. Opening it is explicit and saves the current draft first. Failed/pending generation never changes the active exercise or earlier submissions. No accounts, Sources, RAG, coaching or new editor dependency are added.

Use the engineering playbook and Sailtech ops-agent conventions for typed Python, contextual paragraphs, tests and locked quality tools. GitHub Actions runs the actual local PR, Chrome and Python entry points with read-only repository permissions, isolated synthetic databases and no provider secrets. Host pytest covers deterministic validation/AST rules; solution execution remains browser-only.

## Consequences

Local startup adds a loopback Python service on 8001. A server-only token protects the Next.js/Python boundary; runner processes and browser code receive no credentials. OpenAI requires explicit model/key/enable configuration. The owner selected gpt-6-luna and a USD 1 total evaluation budget. Offline checks establish integration and limits; live quality results are recorded separately from CI.

See [generation lifecycle](../architecture/challenge-generation.md), [Python conventions](../engineering/python-conventions.md) and [CI](../engineering/continuous-integration.md).
