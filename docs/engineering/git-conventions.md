# Git Conventions

Ancora uses Conventional Commits for commit subjects and pull request titles. The goal is reviewable history, searchable change intent, and predictable release notes later.

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

- `feat`: A new feature.
- `fix`: A bug fix.
- `docs`: Documentation-only changes.
- `refactor`: Code changes that neither fix a bug nor add a feature.
- `test`: Adding or updating tests.
- `chore`: Changes to build process, dependencies, generated metadata, or tools.

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
