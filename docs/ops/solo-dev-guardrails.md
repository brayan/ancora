# Solo Developer Guardrails

Ancora is optimized for a solo developer using coding agents. Guardrails keep the project small, private, and reviewable while implementation starts.

## Scope Control

- Prefer one narrow vertical slice over broad scaffolding.
- Keep implementation inside the manifest-owned boundary for the prompt.
- Do not add migrations, dependencies, app scaffolds, infrastructure services, or feature code from documentation-only prompts.
- Add ADRs before changing architecture, ownership, storage, provider strategy, auth/account scope, privacy posture, or deployment scope.

## Privacy

- Treat source material as private and untrusted.
- Do not commit real source material, secrets, production data, raw private prompts, raw private traces, screenshots containing private content, or non-synthetic eval data.
- Use `.env.example` files for configuration shape and real environment variables for secrets.
- Be explicit when OpenAI or another external provider receives account-owned content.

## Worktree Safety

- Inspect `git status --short` before editing.
- Preserve unrelated user changes.
- Do not reset, delete, force-push, or rewrite history unless explicitly requested.
- If unrelated changes block the task, stop and ask for direction.

## Validation

- Run the narrowest meaningful validation available for the touched boundary.
- For docs-only changes, use file checks and targeted search.
- Report missing expected commands instead of inventing behavior.

## Human Review Triggers

Human review is required for changes that set or alter:

- architecture decisions
- auth and account boundaries
- privacy posture
- provider behavior
- durable storage or vector storage
- deployment and infrastructure scope
- agent workflow or repo governance
