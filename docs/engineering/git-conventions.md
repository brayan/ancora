# Git Conventions

Ancora follows the [shared Sailtech Git and PR convention](https://github.com/brayan/engineering-playbook/blob/main/docs/engineering/pull-request-and-commit-convention.md), the same canonical source used by the Sailtech monorepo. These rules apply repository-wide: web, the future Python service, shared packages, tooling and documentation.

## Branch Names

Follow the shared [branch naming rules](https://github.com/brayan/engineering-playbook/blob/main/docs/engineering/pull-request-and-commit-convention.md#branch-names): new work branches use `<type>/<slug>`, with a lowercase, hyphenated slug derived from the change objective. Use the Conventional Commits type for that objective; do not add tool-specific prefixes such as `codex/`.

Ancora examples:

```txt
feat/practice-generation
fix/runner-timeout-recovery
docs/python-service-structure
chore/code-quality-conventions
```

Preserve existing PR head branches during follow-up work. This convention does not authorize renaming/deleting published branches, rewriting history or replacing PRs.

## Required Format

Use this format for commit subjects and PR titles:

```txt
<type>(<optional scope>): <Description>
```

Examples:

```txt
feat(worker): Add batch processing API
fix(history): Resolve deadlock in workflow execution
docs: Update getting started guide
```

The `type` and optional `scope` stay lowercase. The description starts with an uppercase imperative verb.

## Types

The shared standard owns the complete allowed type set. Common examples:

- `feat`: A new feature.
- `fix`: A bug fix.
- `docs`: Documentation-only changes.
- `refactor`: Code changes that neither fix a bug nor add a feature.
- `test`: Adding or updating tests.
- `chore`: Repository maintenance that does not fit a more specific type; use `build` for build systems, packaging and dependencies.

## Scope

Use a scope when it makes the affected boundary clear.

Good scopes include a product area, module, package, or tool boundary:

```txt
feat(web): Add source workspace shell
fix(web-server): Preserve health response schema
docs(frontend): Document Next.js naming rules
chore(guards): Add task context lane
```

Omit the scope when the change is intentionally repo-wide or the type already carries enough context:

```txt
docs: Update monorepo quickstart
chore: Add root workspace manifest
```

Prefer short lowercase scopes. Use kebab-case for multi-word scopes, such as `eval-runner` or `shared-types`.

## Description Guidelines

Follow Chris Beams-style commit subject guidance:

- Start the description with uppercase.
- Use imperative mood: `Add`, `Fix`, `Update`, `Remove`, `Refactor`.
- Be specific. Avoid generic descriptions like `Fix bugs` or `Update stuff`.
- Keep the subject concise and scannable.
- Do not end the subject with a period.

Good:

```txt
fix(web): Preserve selected deck after review submit
docs(api): Explain account-scoped source ownership
test(eval-runner): Cover synthetic smoke output
```

Avoid:

```txt
fix: bug fixes
docs: updated docs.
feat(web): Added source editor
```

## Commit Bodies

Use a body when the subject alone does not explain the motivation, trade-off, migration note, validation, or privacy impact.

Preferred body shape:

```txt
docs(frontend): Add Next.js feature-first convention

Document the local web structure so agents do not need to inspect Sailtech.

Validation:
- scripts/ci/lanes/run-task-context-guards.sh
```

Keep private source material, secrets, production data, and raw trace content out of commit messages and PR descriptions.

## Pull Request Titles

PR titles use the same required format as commit subjects. When a PR contains multiple commits, the PR title should describe the reviewable outcome rather than repeat any one incidental commit.

Good:

```txt
feat(web): Add source ingestion workspace
docs: Define Git and PR title conventions
chore(scaffold): Add monorepo guard lanes
```

PR descriptions should summarize what changed, why it changed, validation run, and any deferred risks.
