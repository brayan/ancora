# Next.js Naming Convention

This document defines naming conventions for Ancora Next.js projects. Structure and ownership are governed by `docs/frontend/nextjs-feature-first-convention.md`.

## File Naming Rules

Use filename shape to show the file's role.

React component files use `PascalCase` and should match the exported component name:

```txt
HomeShell.tsx
SourceList.tsx
DeckReviewPanel.tsx
```

React hook files use `camelCase`, start with `use`, and should match the exported hook name:

```txt
useSourceFilters.ts
useReviewSession.ts
```

Feature contract files stay lowercase and use these canonical names when present:

```txt
actions.ts
constants.ts
data.ts
mappers.ts
schemas.ts
types.ts
utils.ts
```

Feature-local helpers that are not components or hooks may stay lowercase when they are not part of the canonical contract surface.

## App Router Reserved Files

Keep reserved App Router file names exactly as required by Next.js:

```txt
page.tsx
layout.tsx
loading.tsx
error.tsx
route.ts
template.tsx
default.tsx
not-found.tsx
```

## Dynamic Segments

- Use dynamic folders as `[param]`.
- Use catch-all folders as `[...param]`.
- Use optional catch-all folders as `[[...param]]`.
- Dynamic segment tokens should be `camelCase`, such as `[sourceId]`, `[deckId]`, and `[cardId]`.

## Imports

- Prefer `@/` imports inside `apps/web` so feature boundaries remain visible after file moves.
- Update import specifiers whenever files are renamed.
- Do not add feature-level barrel files just to shorten imports.
- Shared package imports should remain explicit, such as `@ancora/ui` or `@ancora/shared-types`.

## Test Names

New and edited TS/JS web tests should use behavior-focused names with `should` and `when` semantics:

```ts
test("should list scaffold lanes when home constants are loaded", () => {
  // ...
});
```

Prefer one scenario per test. Use blank-line grouping for optional setup, exercised action, and assertions without `given`/`when`/`then` comments.

## Local Enforcement

The current filename guard is:

```bash
pnpm --filter @ancora/web lint:naming
```

The broader web lane is:

```bash
pnpm --filter @ancora/web lint
```
