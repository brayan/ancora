# Ancora Project Plan

**Project:** Ancora  
**Positioning:** AI-native learning platform
**Status:** Implementation planning  
**Date:** 2026-05-22

**Governance note:** This plan is retained as implementation context. Current repo governance is defined by `AGENTS.md`, `docs/agents/repo-manifest.yaml`, the project shards, and accepted ADRs. Uploaded file ingestion, a standalone Node API, Kubernetes, Terraform, Redis, and PyTorch remain deferred until the core vertical slice works and an ADR changes the scope.

---

## 1. Project thesis

Ancora will be a real daily-use learning application. The product will turn source material into grounded flashcards, adaptive quizzes, guided study sessions, and measurable learning progress.

The product goal is simple:

> Ancora helps a learner import knowledge, generate high-quality study material, review it daily, get AI-assisted explanations, and track mastery over time.

---

## 2. Strategic positioning

### What Ancora should communicate

- Strong full-stack product engineering.
- Strong Python-based AI engineering.
- Practical RAG implementation with sources, citations, and retrieval quality control.
- Bounded agents and workflows using LangGraph.
- Prompt management and LLM observability through Langfuse.
- System/product observability through Grafana and OpenTelemetry.
- Evals as a first-class part of development.
- A professional monorepo structure with clear boundaries.
- A product that can be used every day.

### What Ancora should avoid

- Adding Node.js, Kubernetes, Terraform, PyTorch, or fine-tuning before the core app works.
- Becoming another generic “ChatGPT wrapper.”
- Hiding prompts, evals, and observability in undocumented implementation details.

---

## 3. Product concept

Ancora is an AI-native learning platform for converting source material into personalized study workflows.

### Core user flow

1. The user adds learning material: pasted text, markdown, PDFs, articles, notes, transcripts, or code snippets.
2. Ancora chunks, embeds, and stores the source material.
3. The user can ask questions against the material through a RAG tutor.
4. Ancora generates grounded flashcards with citations to source chunks.
5. The user reviews flashcards daily using spaced repetition.
6. The user can answer quizzes, including free-text questions.
7. AI grades free-text answers using rubrics and source material.
8. A LangGraph study workflow identifies weak concepts and suggests targeted study.
9. Langfuse traces the LLM behavior, prompts, scores, cost, and latency.
10. Grafana tracks system health, latency, errors, jobs, and product usage metrics.

### Product tagline

> Turn your knowledge sources into grounded flashcards, adaptive quizzes, and guided study sessions.

---

## 4. Why a flashcard/quiz product is a strong AI Engineering project

A learning app gives the AI system a real reason to exist. It naturally requires ingestion, retrieval, structured generation, grading, feedback loops, user analytics, scheduling, observability, and evals.

| Product feature | Engineering skill demonstrated |
|---|---|
| Source ingestion | Data pipelines, parsing, chunking, metadata design |
| Flashcard generation | Prompt engineering, structured outputs, validation |
| RAG tutor | Retrieval, embeddings, vector search, citations |
| Free-text answer grading | LLM-as-judge, rubrics, semantic evaluation |
| Card quality checks | Evals, hallucination checks, groundedness scoring |
| Spaced repetition | Algorithms, domain modeling, user state |
| Study agent | LangGraph, stateful workflows, tool usage |
| Langfuse integration | LLMOps, traces, prompts, eval scores, cost/latency |
| Grafana dashboards | Observability, product metrics, system health |
| CI/CD and Docker | Production engineering maturity |

---

## 5. Core stack decisions

### v1 stack

| Layer | Choice | Reason |
|---|---|---|
| Web app | Next.js + TypeScript | Full-stack UI, modern web app, strong market alignment |
| AI runtime | Python + FastAPI | Best fit for LLM workflows, RAG, evals, ML libraries |
| Database | PostgreSQL | Durable product data and strong SQL foundation |
| Vector search | pgvector initially | Keeps v1 simpler by using PostgreSQL for vector storage |
| RAG/LLM components | LangChain | Useful building blocks for loaders, splitters, embeddings, retrievers, prompts |
| Agents/workflows | LangGraph | Stateful study workflows and bounded agent orchestration |
| LLM observability | Langfuse | Traces, prompt management, scoring, evals, cost/latency |
| System observability | Grafana + OpenTelemetry | Metrics, traces, dashboards, operational visibility |
| Background work | Python workers | Ingestion, embeddings, card generation, eval jobs |
| Local environment | Docker Compose | One-command local development |
| CI/CD | GitHub Actions | Tests, linting, eval smoke checks, build validation |

### Later additions

| Addition | When to add | Why |
|---|---|---|
| Node.js/NestJS product API | v2 or v3 | Only if product API complexity justifies a separate service |
| Kubernetes | v3+ | Cloud/platform readiness after the local product works |
| Terraform | v3+ | Infrastructure-as-code after deployment targets are clear |
| Redis | v1.5/v2 | Queues, caching, rate limiting, session support |
| PyTorch | v3+ | ML experiment such as difficulty prediction or reranking |
| Scikit-learn | v3+ | Baseline classifiers for card difficulty or topic classification |
| Mobile app | v3+ | Optional daily review app once the web product is strong |

---

## 6. Monorepo structure

```txt
ancora/
  apps/
    web/

  services/
    ai-runtime/
    workers/
  tools/
    eval-runner/

  packages/
    ui/
    shared-types/
    schemas/
    config/

  prompts/
    flashcard-generation/
    answer-grading/
    rag-tutor/
    study-agent/
    card-quality-evaluator/

  evals/
    datasets/
    rubrics/
    reports/
    fixtures/

  config/

  docker/
    docker-compose.yml

  infra/
    observability/
      langfuse/
      grafana/
      prometheus/
      opentelemetry/

  docs/
    architecture/
    adr/
    product/
    implementation/
    diagrams/

  scripts/
    dev/
    db/
    evals/
    infra/

  .github/
    workflows/
```

### Top-level folder responsibilities

| Folder | Responsibility |
|---|---|
| `apps/` | User-facing applications such as the web app and future mobile app |
| `services/` | Independently runnable backend/AI services |
| `tools/` | Internal CLIs and artifact boundaries |
| `packages/` | Shared internal libraries and configuration |
| `prompts/` | Versioned prompts, rubrics, model instructions, and schemas |
| `evals/` | Datasets, rubrics, fixtures, and evaluation reports |
| `config/` | Repository-level non-secret configuration artifacts |
| `docker/` | Local Docker Compose foundation |
| `infra/` | Observability configuration placeholders |
| `docs/` | Architecture, product decisions, ADRs, diagrams, implementation plans |
| `scripts/` | Automation scripts for development, database, evals, and infrastructure |
| `.github/` | CI/CD workflows |

### Naming rationale

- Use `apps/web` instead of `frontend` because the repo may later include `apps/mobile`, `apps/admin`, or `apps/docs`.
- Use `services/ai-runtime` instead of `backend` because the FastAPI service has a specific role: RAG, LLMs, agents, and AI workflows.
- Use `services/workers` for background jobs such as ingestion, embeddings, async card generation, and eval jobs.
- Use `tools/eval-runner` because evals are a first-class internal CLI and artifact boundary, not a deployable service.
- Use `prompts/` as a top-level folder because prompts are product artifacts, not incidental strings hidden in code.
- Use `evals/` as a top-level folder because AI quality measurement is central to the project.
- Put Langfuse and Grafana under `infra/observability/` because they are operational dependencies, not Ancora business services.

---

## 7. Architecture overview

### v1 architecture

```txt
User
  |
  v
apps/web                    Next.js + TypeScript
  |
  | HTTP/API calls
  v
services/ai-runtime          FastAPI + Python
  |  |  |
  |  |  +--> LangChain: RAG components
  |  |  +--> LangGraph: study workflows/agents
  |  |  +--> LLM provider integration
  |
  +--> PostgreSQL + pgvector
  |
  +--> Langfuse for LLM traces, prompts, evals, cost/latency
  |
  +--> OpenTelemetry -> Grafana/Prometheus for system metrics

services/workers
  |
  +--> ingestion jobs
  +--> embedding jobs
  +--> card generation jobs
  +--> eval jobs
```

### Main service responsibilities

| Component | Responsibility |
|---|---|
| `apps/web` | Decks, sources, review sessions, quiz UI, tutor UI, dashboards |
| `services/ai-runtime` | RAG, LLM calls, LangChain, LangGraph, card generation, answer grading |
| `services/workers` | Async ingestion, embeddings, generation jobs, eval jobs |
| `tools/eval-runner` | Offline evals, prompt comparisons, report generation |
| PostgreSQL + pgvector | Users, sources, chunks, embeddings, decks, cards, reviews, eval results |
| Langfuse | LLM traces, prompt versions, datasets, eval scores, cost, latency |
| Grafana | System health, product metrics, service latency, errors, job metrics |

---

## 8. Data model draft

The data model should support versioning, traceability, and learning state.

```txt
users
sources
source_chunks
decks
cards
card_versions
reviews
quiz_sessions
quiz_questions
quiz_answers
concepts
card_concepts
prompts
prompt_versions
eval_runs
eval_results
llm_trace_refs
```

### Key entities

| Entity | Purpose |
|---|---|
| `sources` | Original material added by the user |
| `source_chunks` | Chunked source text with metadata and embedding references |
| `decks` | User-defined collections of cards |
| `cards` | Stable flashcard identity |
| `card_versions` | Generated/edited versions of a card |
| `reviews` | Spaced repetition review history |
| `quiz_sessions` | Quiz attempts and session metadata |
| `quiz_answers` | User answers and AI grading results |
| `concepts` | Extracted topics or knowledge concepts |
| `eval_runs` | Execution records for eval suites |
| `eval_results` | Per-example and aggregate eval scores |
| `llm_trace_refs` | References to Langfuse trace IDs |

### Traceability principle

Every generated flashcard should be traceable to:

```txt
source -> source_chunks -> prompt_version -> model_config -> LLM trace -> card_version -> eval scores -> user feedback
```

This is the LLMOps backbone of Ancora.

---

## 9. RAG workflow

The RAG system is central to Ancora. It should be used for tutoring, card generation, answer explanation, and card validation.

### Source ingestion

```txt
User adds source material
  -> normalize text
  -> split into chunks
  -> attach metadata
  -> generate embeddings
  -> store chunks and vectors
  -> make source searchable
```

### Retrieval

```txt
User asks question or requests cards
  -> build query
  -> retrieve relevant chunks
  -> optionally rerank
  -> pass context to LLM
  -> generate answer/cards with citations
```

### RAG quality concerns

| Concern | Mitigation |
|---|---|
| Bad chunks | chunking strategy, overlap, metadata, source previews |
| Wrong context | retrieval evals, reranking later, feedback loop |
| Unsupported answers | citation checks, groundedness evals |
| Stale content | source versioning and re-indexing |
| Duplicate material | source hashing and chunk deduplication |

---

## 10. Flashcard generation workflow

### Card generation flow

```txt
Selected source/deck
  -> retrieve relevant chunks
  -> generate structured card candidates
  -> validate schema
  -> run card quality checks
  -> attach citations
  -> save as card_versions
  -> show user for review/editing
```

### Card types

| Type | Example use |
|---|---|
| Basic Q/A | Definition, fact, concept explanation |
| Cloze deletion | Memorizing key terms inside a sentence |
| Multiple choice | Quick quiz mode |
| Free recall | Deeper understanding and explanation |
| Code explanation | Programming concepts or code review |
| Comparison | Distinguish similar concepts |
| Scenario-based | Apply knowledge to realistic situations |

### Example structured output

```json
{
  "card_type": "basic",
  "question": "What is retrieval-augmented generation?",
  "answer": "A technique where relevant external context is retrieved and provided to the model before generation.",
  "source_chunk_ids": ["chunk_123", "chunk_456"],
  "difficulty": "medium",
  "concepts": ["RAG", "LLMs", "retrieval"],
  "bloom_level": "understand"
}
```

---

## 11. Answer grading workflow

Free-text answer grading is one of the most valuable AI features in Ancora.

### Flow

```txt
User answers a question
  -> retrieve expected answer and source chunks
  -> send answer + rubric + source context to LLM grader
  -> return score, feedback, missing points, misconceptions
  -> store result
  -> update review scheduling
```

### Grading output

```json
{
  "score": 0.86,
  "is_correct": true,
  "feedback": "Your answer is mostly correct. You correctly explained that RAG adds external context at query time.",
  "missing_points": ["Mention that RAG helps with fresh or private knowledge."],
  "misconceptions": [],
  "recommended_action": "review_later"
}
```

### Grading evals

The grader should be evaluated against a small golden dataset containing:

- question
- expected answer
- user answer
- human score
- human feedback notes
- acceptable scoring range

---

## 12. Spaced repetition engine

The first scheduler should be simple and reliable. Advanced scheduling can come later.

### v1 scheduling fields

```txt
card_id
user_id
last_reviewed_at
next_review_at
interval_days
ease
review_count
lapse_count
last_rating
```

### v1 ratings

| Rating | Meaning | Scheduling behavior |
|---|---|---|
| Again | User failed or forgot | Review soon |
| Hard | User barely remembered | Short interval |
| Good | User remembered correctly | Normal interval |
| Easy | User remembered easily | Longer interval |

### Later scheduling improvements

- SM-2-like scheduling.
- Desired retention settings.
- FSRS-inspired scheduling.
- Personalized memory state based on review history.

---

## 13. LangGraph study agent

Ancora should use LangGraph for a bounded, stateful study workflow. The agent should not be fully autonomous. It should operate within defined tools and product rules.

### Study agent flow

```txt
Start daily study session
  -> load due cards
  -> inspect weak concepts
  -> retrieve source context
  -> choose study strategy
  -> generate targeted quiz
  -> grade answers
  -> explain mistakes
  -> update learning state
  -> suggest next action
```

### Agent tools

| Tool | Purpose |
|---|---|
| `get_due_cards` | Load cards due for review |
| `get_weak_concepts` | Find topics with low scores or repeated lapses |
| `search_sources` | Retrieve source chunks for explanations |
| `generate_quiz` | Create targeted quiz questions |
| `grade_answer` | Score free-text answers |
| `create_card_candidate` | Suggest new cards from weak areas |
| `save_review_result` | Persist review outcomes |

### Agent principle

Ancora should be workflow-first, agent-enhanced.

This means predictable product flows should remain deterministic, while the agent helps with strategy, explanation, generation, and adaptive study.

---

## 14. Evals strategy

Evals are a first-class part of Ancora. They should be visible in the repo, runnable locally, and eventually used in CI.

### Eval categories

| Eval | Measures |
|---|---|
| Card generation quality | atomicity, usefulness, clarity, schema validity |
| Groundedness | whether generated cards are supported by source chunks |
| Citation accuracy | whether citations support the generated answer/card |
| RAG tutor quality | answer relevance, faithfulness, source coverage |
| Answer grading | agreement with human scores and feedback quality |
| Agent workflow | task completion, tool-use correctness, failure handling |
| Regression evals | whether new prompts/models break old behavior |

### Example metrics

```txt
card_schema_validity_rate
card_groundedness_score
citation_accuracy
retrieval_recall_at_k
answer_grading_agreement
hallucination_failure_rate
agent_task_success_rate
average_llm_latency
average_cost_per_generation
```

### Eval folder structure

```txt
evals/
  datasets/
    card_generation.jsonl
    answer_grading.jsonl
    rag_tutor.jsonl

  rubrics/
    card_quality.md
    answer_grading.md
    groundedness.md

  reports/
    2026-05-22-v0.1.md

  fixtures/
    sample_sources/
```

### CI eval gates for early versions

Start with smoke evals only:

- output schema is valid
- required fields are present
- generated card has source references
- RAG answer includes citations
- no critical runtime errors

Later add quality thresholds.

---

## 15. Langfuse integration plan

Langfuse should be used for LLM-specific observability and LLMOps.

### Trace these workflows

```txt
generate_flashcards
evaluate_card_quality
grade_answer
explain_wrong_answer
generate_quiz
rag_tutor_answer
run_study_agent
```

### Capture metadata

```txt
user_id or anonymized local user id
deck_id
source_id
source_chunk_ids
prompt_version
model_provider
model_name
temperature
input_tokens
output_tokens
estimated_cost
latency_ms
output_schema_version
eval_scores
user_feedback
```

### Use Langfuse for

- LLM traces.
- Prompt management.
- Prompt experiments.
- Eval scores.
- Golden datasets.
- Cost and latency visibility.
- Debugging bad generations.
- Comparing model/prompt versions.

---

## 16. Grafana and system observability

Grafana should be used for system and product health. It should not replace Langfuse.

### Observability separation

| Tool | Role |
|---|---|
| Langfuse | LLM traces, prompts, evals, cost, model behavior |
| Grafana | API metrics, infra metrics, traces, logs, dashboards, alerts |
| OpenTelemetry | Instrumentation layer for traces and metrics |
| Prometheus | Metrics storage for Grafana dashboards |

### Grafana dashboard ideas

```txt
API request rate
API latency p50/p95/p99
FastAPI AI-runtime latency
LLM request count
Embedding job duration
RAG retrieval latency
PostgreSQL query latency
Worker queue depth
Card generation failure rate
Eval run duration
Review sessions completed
Cards reviewed per day
Average answer score
```

---

## 17. Prompt registry

Prompts should be treated like product artifacts.

### Prompt folder example

```txt
prompts/
  flashcard-generation/
    system.md
    user-template.md
    schema.json
    rubric.md
    metadata.yaml

  answer-grading/
    system.md
    user-template.md
    schema.json
    rubric.md
    metadata.yaml
```

### Prompt metadata example

```yaml
name: flashcard_generation
version: 0.1.0
owner: brayan
model_family: general_llm
output_schema: flashcard_candidate_v1
intended_use: Generate grounded flashcards from source chunks
risk_level: medium
```

### Why this matters

Prompt versioning makes it possible to connect:

```txt
prompt version -> model response -> eval score -> product result -> future improvement
```

---

## 18. Security, safety, and privacy

Ancora may contain personal notes, private study material, or uploaded files. Treat the product as privacy-sensitive from the beginning.

### v1 safeguards

- Do not commit user content to the repo.
- Use synthetic/sample learning material for demos.
- Keep API keys in environment variables.
- Add `.env.example`, never `.env`.
- Use source IDs and chunk IDs instead of leaking full source text into logs when possible.
- Make it clear when LLM providers receive user content.
- Add delete-source and delete-deck functionality eventually.
- Keep Langfuse traces local/self-hosted for local development.

### AI safety concerns

| Concern | Mitigation |
|---|---|
| Hallucinated flashcards | groundedness checks and citations |
| Bad answer grading | rubrics and grading evals |
| Unsupported tutor answers | RAG faithfulness evals |
| Prompt injection in source material | treat source text as untrusted context |
| Overconfident feedback | include uncertainty and source references |

---

## 19. Local development setup

The first developer experience goal is one-command startup.

### Expected local services

```txt
Next.js web app
FastAPI ai-runtime
PostgreSQL + pgvector
Langfuse
Grafana
Prometheus
OpenTelemetry collector
```

### Commands to support

```bash
make dev
make test
make lint
make eval-smoke
make db-migrate
make db-seed
make docker-up
make docker-down
```

### Environment files

```txt
.env.example
apps/web/.env.example
services/ai-runtime/.env.example
docker/postgres.env.example
```

---

## 20. CI/CD plan

Use GitHub Actions from the beginning.

### Initial workflows

```txt
.github/workflows/ci.yml
.github/workflows/eval-smoke.yml
.github/workflows/docker-build.yml
```

### CI checks

| Check | Purpose |
|---|---|
| TypeScript lint | Maintain frontend code quality |
| TypeScript tests | Validate UI/business logic |
| Python lint | Maintain service quality |
| Python tests | Validate AI runtime logic |
| Schema validation | Ensure structured output schemas are valid |
| Eval smoke tests | Catch prompt/schema regressions |
| Docker build | Ensure services can run in containers |

### Later CI/CD additions

- Preview deployments.
- Full eval suite nightly.
- Prompt regression comparisons.
- Kubernetes deployment checks.
- Terraform validation.

---

## 21. Implementation roadmap

### Phase 0: Repo foundation

Goal: create a professional monorepo foundation.

Deliverables:

- Repository initialized.
- Folder structure created.
- README with product thesis.
- Implementation plan added to `docs/implementation/`.
- Basic Next.js app shell.
- Basic FastAPI service shell.
- Docker Compose with PostgreSQL + pgvector.
- Initial GitHub Actions CI.

### Phase 1: First AI vertical slice

Goal: prove the core RAG loop.

Deliverables:

```txt
Paste source material
  -> store source
  -> chunk text
  -> create embeddings
  -> store chunks/vectors
  -> ask a question
  -> retrieve context
  -> generate cited answer
  -> see trace in Langfuse
```

This is the most important first milestone.

### Phase 2: Flashcards and review loop

Goal: make Ancora useful daily.

Deliverables:

- Generate flashcards from source chunks.
- Validate structured outputs.
- Store cards and card versions.
- Attach citations to cards.
- Review cards with Again/Hard/Good/Easy.
- Schedule next review.
- Show daily due cards.

### Phase 3: Evals and grading

Goal: show serious AI Engineering quality controls.

Deliverables:

- Card quality evals.
- RAG groundedness evals.
- Free-text answer grading.
- Answer grading eval dataset.
- Eval reports in repo.
- Langfuse scores attached to generations.
- Eval smoke tests in CI.

### Phase 4: LangGraph study workflow

Goal: add bounded agentic behavior.

Deliverables:

- Daily study agent.
- Weak concept analysis.
- Targeted quiz generation.
- Mistake explanations using source material.
- Review state updates.
- Langfuse traces for each graph step.

### Phase 5: Observability maturity

Goal: show production-style operations.

Deliverables:

- OpenTelemetry instrumentation.
- Grafana dashboards.
- Prometheus metrics.
- Latency and error dashboards.
- Product usage metrics.
- LLM cost and latency visibility.

### Phase 6: Advanced platform layer

Goal: add advanced market-aligned skills only after the product works.

Possible additions:

- Node.js/NestJS product API.
- Kubernetes manifests.
- Terraform modules.
- Redis queues.
- PyTorch/Scikit-learn model experiments.
- Mobile review app.
- Public demo deployment.

---

## 22. v1 definition of done

v1 is done when a user can:

1. Open the web app.
2. Add source material.
3. Ask a question about the material.
4. Receive a grounded answer with citations.
5. Generate flashcards from the material.
6. Review flashcards.
7. Persist review results.
8. See LLM traces in Langfuse.
9. See basic system metrics in Grafana.
10. Run the stack locally with Docker Compose.
11. Run tests and eval smoke checks in CI.

The v1 goal is not feature completeness. The v1 goal is a complete, observable, evaluated, daily-usable vertical slice.

---

## 23. README and portfolio strategy

The README should be optimized for both engineers and hiring managers.

### README opening

> Ancora is an AI-native learning platform that turns source material into grounded flashcards, adaptive quizzes, and guided study sessions. It demonstrates full-stack AI engineering with Next.js, FastAPI, PostgreSQL/pgvector, LangChain, LangGraph, Langfuse, Grafana, evals, and production-style observability.

### README must include

- Product explanation.
- Architecture diagram.
- Quickstart.
- Screenshots or GIFs.
- What AI techniques are implemented.
- How evals work.
- How Langfuse and Grafana are used.
- Monorepo structure.
- Development commands.
- Roadmap.
- Known limitations.

### Portfolio positioning

Ancora should be described as:

> A production-style AI learning platform with RAG, flashcard generation, answer grading, LangGraph study workflows, eval pipelines, Langfuse LLM observability, Grafana dashboards, and full-stack product architecture.

---

## 24. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Project becomes too large | Start with a narrow vertical slice |
| Too many technologies | Add tools only when there is a clear responsibility |
| AI output quality is weak | Build evals early |
| Repo looks like a demo | Make it useful for daily study |
| Observability becomes superficial | Track real traces, costs, latency, errors, eval scores |
| RAG is shallow | Include citations, chunk metadata, retrieval evals |
| Agent is vague | Use a bounded LangGraph study workflow |
| Fine-tuning distracts from product | Delay until data and need exist |
| Setup is hard | Docker Compose and clear README |

---

## 25. Architecture decision records captured

Accepted ADRs live under `docs/adr/`.

```txt
0001-use-monorepo.md
0002-fastapi-owns-v1-product-and-ai-api.md
0003-auth-and-account-are-v1-scope.md
0004-use-openai-as-default-llm-provider.md
0005-use-postgresql-pgvector-for-v1.md
0006-defer-standalone-node-api-kubernetes-terraform.md
0007-place-eval-runner-under-services.md
0008-use-nextjs-for-v1-client-ui.md
```

Each ADR should include:

```txt
Context
Decision
Alternatives considered
Consequences
Status
```

---

## 26. Immediate next steps

1. Create the repository.
2. Add this document to `docs/implementation/ancora-project-plan-v0.2.md`.
3. Create the folder structure.
4. Add root README.
5. Add `.env.example` files.
6. Add Docker Compose with PostgreSQL + pgvector.
7. Create Next.js app shell.
8. Create FastAPI service shell.
9. Add first source ingestion endpoint.
10. Add first RAG tutor endpoint.
11. Integrate Langfuse tracing.
12. Add first Grafana dashboard skeleton.
13. Add CI checks.

---

## 27. Final guiding principle

Ancora should not try to prove every possible skill at once.

Ancora should prove something more valuable:

> The ability to design, build, evaluate, observe, and iterate on a real AI product.

That is the exact signal a strong Full-Stack AI Engineer should send.
