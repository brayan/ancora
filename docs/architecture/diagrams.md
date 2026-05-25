# Architecture Diagrams

These diagrams are portfolio evidence, not implementation claims. Labels show whether a boundary is Implemented, In progress, Planned, or Deferred.

## Status Legend

| Status | Meaning |
|---|---|
| Implemented | Present in the repo today as governance, scaffold, config, or documentation. |
| In progress | Scaffolded or documented, but not yet a complete product feature. |
| Planned | Accepted v1 direction, not yet implemented as product behavior. |
| Deferred | Outside v1 until an ADR or later roadmap item changes scope. |

## Current and Planned System Architecture

```mermaid
flowchart LR
  User["User<br/>Planned"]
  Browser["Next.js browser UI<br/>In progress"]
  Routes["app/api auth route handlers<br/>Implemented"]
  Server["apps/web/server product and AI runtime<br/>In progress"]
  Auth["Auth.js credentials and account boundary<br/>Implemented"]
  DB["Drizzle PostgreSQL plus pgvector schema<br/>Implemented"]
  OpenAI["OpenAI LLM and embeddings<br/>Planned"]
  Prompts["Versioned prompts<br/>In progress"]
  Evals["TypeScript eval runner<br/>In progress"]
  Langfuse["Langfuse trace references<br/>Planned"]
  Docs["Portfolio evidence docs<br/>Implemented"]

  User --> Browser
  Browser --> Routes
  Routes --> Server
  Server --> Auth
  Server --> DB
  Server --> OpenAI
  Server --> Prompts
  Server --> Evals
  Server --> Langfuse
  Docs -.-> Browser
  Docs -.-> Server
```

## Implemented Auth and Account Data Foundation

```mermaid
flowchart LR
  SignUp["Local sign-up form<br/>Implemented"]
  AuthRoute["Auth.js routes and register API<br/>Implemented"]
  UserRow["users<br/>Implemented"]
  AccountRow["accounts<br/>Implemented"]
  Membership["account_memberships<br/>Implemented"]
  AuthTables["auth_provider_accounts and auth_sessions<br/>Implemented"]
  Scope["fail-closed account helpers<br/>Implemented"]
  SourceTables["sources, source_chunks, llm_trace_refs<br/>Implemented foundation"]

  SignUp --> AuthRoute
  AuthRoute --> UserRow
  AuthRoute --> AccountRow
  UserRow --> Membership
  AccountRow --> Membership
  UserRow --> AuthTables
  Membership --> Scope
  Scope --> SourceTables
```

## Planned RAG Flow

```mermaid
flowchart TD
  Source["Pasted source text<br/>Planned"]
  Guard["Account and privacy checks<br/>Planned"]
  Chunk["Chunk source with metadata<br/>Planned"]
  Embed["Generate embeddings<br/>Planned"]
  Store["Store chunks and vectors<br/>Planned"]
  Query["Tutor or generation query<br/>Planned"]
  Retrieve["Retrieve account-scoped chunks<br/>Planned"]
  BuildPrompt["Build prompt with chunk IDs<br/>Planned"]
  Generate["Generate grounded answer or card<br/>Planned"]
  Cite["Attach citations and trace reference<br/>Planned"]
  Review["Learner review workflow<br/>Planned"]

  Source --> Guard
  Guard --> Chunk
  Chunk --> Embed
  Embed --> Store
  Query --> Retrieve
  Store --> Retrieve
  Retrieve --> BuildPrompt
  BuildPrompt --> Generate
  Generate --> Cite
  Cite --> Review
```

## Planned Eval Flow

```mermaid
flowchart LR
  Dataset["Synthetic eval dataset<br/>In progress"]
  Runner["tools/eval-runner CLI<br/>In progress"]
  PromptVersion["Prompt version<br/>In progress"]
  Retrieval["Retrieval candidate set<br/>Planned"]
  ModelCall["Model call or stub<br/>Planned"]
  Checks["Deterministic checks<br/>Planned"]
  Quality["Report-only quality grades<br/>Planned"]
  Report["Privacy-safe eval report<br/>Planned"]

  Dataset --> Runner
  PromptVersion --> Runner
  Runner --> Retrieval
  Runner --> ModelCall
  Retrieval --> Checks
  ModelCall --> Checks
  ModelCall --> Quality
  Checks --> Report
  Quality --> Report
```

## Planned Observability Flow

```mermaid
flowchart TD
  Request["Product request<br/>Planned"]
  TraceContext["Trace context with account-safe IDs<br/>Planned"]
  Runtime["AI runtime step<br/>Planned"]
  Provider["OpenAI provider call<br/>Planned"]
  Metrics["Latency, tokens, cost estimate, status<br/>Planned"]
  Langfuse["Langfuse trace<br/>Planned"]
  OTel["OpenTelemetry app signal<br/>Planned"]
  Dashboards["Grafana or Prometheus dashboards<br/>Planned"]
  ProductDB["Trace reference in product DB<br/>Planned"]
  Redaction["No raw private source text in traces<br/>Planned"]

  Request --> TraceContext
  TraceContext --> Runtime
  Runtime --> Provider
  Provider --> Metrics
  Runtime --> Langfuse
  Runtime --> OTel
  Metrics --> Dashboards
  Langfuse --> ProductDB
  TraceContext --> Redaction
  Langfuse --> Redaction
  OTel --> Redaction
```
