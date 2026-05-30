# Business Problem

## Status Summary

| Status | Scope |
|---|---|
| Implemented | Product language, privacy principles, ADRs, repo boundaries, TypeScript-first scaffold, auth/account foundation, and database ownership model are documented. |
| In progress | Portfolio evidence docs define the public product narrative as implementation continues. |
| Planned | Account-aware source creation, grounded flashcards, adaptive quizzes, tutor workflows, evals, and observability. |
| Deferred | Uploaded file ingestion, mobile apps, institutional administration, marketplace content, and production-scale learning analytics. |

## Learner Pain

Learners often collect private notes, articles, transcripts, and course material but struggle to turn that material into reliable study assets. Generic AI tutors can answer fluently without grounding, flashcard tools often separate creation from source evidence, and study history can become disconnected from the material that should justify each answer.

Ancora focuses on the gap between private learning sources and trustworthy study workflows:

- Learners need answers and cards tied back to source chunks, not unsupported summaries.
- Learners need a clear boundary between private material and external LLM provider calls.
- Learners need study material that can improve through tests, evals, trace references, and review history.
- Builders and reviewers need visible tradeoffs, failure cases, and operational assumptions instead of hidden AI behavior.

## Target User

The initial target user is an individual learner or portfolio reviewer evaluating a full-stack AI product. The learner wants to paste private study material, generate grounded cards, ask tutor questions, and review progress inside an account boundary.

The portfolio reviewer wants to see whether the product has credible engineering shape: product problem, architecture decisions, privacy posture, tests, evals, monitoring, deployment model, cost thinking, and a roadmap that does not overclaim.

## Product Promise

Ancora turns account-owned learning sources into grounded study material. Each generated artifact should be traceable to source IDs, chunk IDs, prompt versions, model settings, eval results, and trace references without copying private source text into logs, docs, fixtures, screenshots, or reports.

## Non-Goals

- Ancora is not a generic chatbot detached from user sources.
- Ancora is not a public content library or course marketplace.
- Ancora is not starting with uploaded file ingestion, OCR, or PDF parsing.
- Ancora is not starting with a separate Python runtime, Kubernetes platform, Terraform stack, Redis queue, or standalone vector database.
- Ancora is not committing real private learning material as demo content or eval data.

## Success Criteria

| Status | Criteria |
|---|---|
| Implemented | The repo states the product thesis, canonical terms, accepted v1 stack, privacy constraints, deferred platform scope, and implemented account ownership foundation. |
| In progress | Documentation links the business problem to architecture, testing, evals, operations, cost, and roadmap expectations. |
| Planned | A learner can create account-scoped sources, generate grounded cards, ask cited tutor questions, review study material, and inspect trace/eval references. |
| Planned | Tests and evals cover grounding, citations, account isolation, failure paths, and privacy-sensitive artifacts. |
| Planned | Monitoring exposes latency, token use, cost, model/provider failures, retrieval quality signals, and privacy-safe trace references. |
| Deferred | Larger scale collaboration, uploaded file workflows, advanced scheduling, provider routing, and enterprise controls wait for later ADRs or roadmap prompts. |
