# Next.js Feature-First Convention

Ancora Next.js work follows a feature-first App Router structure adapted from Sailtech's Console Web conventions. The goal is to keep framework contracts visible, product behavior owned by feature modules, and server-only infrastructure out of client-safe utilities.

Use this with `docs/frontend/nextjs-naming-convention.md`.

## Core Model

`app/` is the delivery boundary. Keep route files thin and limited to App Router contracts such as routes, layouts, metadata, loading/error files, and small orchestration.

`features/*` is the product boundary. Product UI, view models, validation, mapping, feature constants, loaders, and later server actions belong under a capability folder.

Do not introduce Clean Architecture, MVVM, or framework-agnostic layer folders such as `domain`, `use-cases`, `repositories`, `view-models`, `presenters`, or `infra` inside the Next.js app.

## Target Shape

```txt
apps/web/
  app/
  features/
  components/
    ui/
    layout/
  server/
  lib/
  tests/
  public/
  scripts/
```

- `app/`: App Router contracts only. Pages and layouts may compose feature components but should not own product workflows.
- `features/`: Ancora product capabilities such as sources, decks, reviews, tutor, quiz, dashboard, and onboarding.
- `components/ui/`: Generic UI primitives and controls. They must be product-agnostic.
- `components/layout/`: Generic shell and layout components. They must avoid feature-specific product behavior.
- `server/`: Server-only infrastructure: service clients, environment reads, request helpers, telemetry setup, auth/session helpers, and server caches.
- `lib/`: Generic client-safe utilities only. Do not put service clients, environment reads, telemetry bootstrap, auth/session reads, or other server infrastructure here.
- `tests/`: Cross-route, integration, or harness tests that do not belong beside one feature file.
- `public/`: Static assets served by Next.js.
- `scripts/`: App-local checks and automation.

## Feature Folder Contract

Recommended feature baseline:

```txt
features/<capability>/
  components/
    CapabilityScreen.tsx
    CapabilityTable.tsx
  constants.ts
  types.ts
```

Add these files only when the feature needs them:

```txt
features/<capability>/
  data.ts
  actions.ts
  schemas.ts
  mappers.ts
  utils.ts
  hooks/
    useCapabilityFilters.ts
```

- `components/`: Feature-owned React UI.
- `data.ts`: Server-only read loaders and query orchestration. This file should be treated as server-only.
- `actions.ts`: Server actions and mutation entrypoints. Start this file with `'use server'`.
- `schemas.ts`: Client-safe validation schemas and parse helpers.
- `types.ts`: Feature-owned public types and view models.
- `constants.ts`: Feature constants, route paths, labels, enum-like values, and endpoint strings when reuse is justified.
- `mappers.ts`: Pure mapping between backend DTOs, view models, and form state.
- `utils.ts`: Pure feature-local utilities.
- `hooks/`: Feature-owned React hooks for browser APIs and client interaction state.

Do not create empty convention folders. Add `hooks/`, `mappers.ts`, `schemas.ts`, and similar files when there is real code to place there.

## Import Rules

- `app/**` may import from `features/**`, `components/layout/**`, `components/ui/**`, `server/**`, and `lib/**`.
- `features/**` must not import from `app/**`.
- Client components must not import `data.ts`, `actions.ts`, `server/**`, environment modules, auth/session helpers, or service clients.
- `components/ui/**` must not import from `app/**`, `features/**`, `server/**`, or product state.
- `components/layout/**` must stay generic and must not import feature product behavior.
- `server/**` must not import from `app/**` or feature UI. Keep server infrastructure generic.
- `lib/**` must not import from `app/**`, `features/**`, or `server/**`.
- Avoid cross-feature imports by default. If multiple features need the same product concept, extract an intentional shared feature or server helper.
- Do not add feature-level barrel files by default. Prefer direct imports from explicit files.

## Server Boundary Rules

- Shared service clients, environment access, request parsing, response helpers, telemetry setup, server caches, and auth/session helpers belong in top-level `server/**`.
- Browser-safe display helpers may live in `lib/**`, but only when they do not import server infrastructure.
- `app/api/**/route.ts` files should parse framework input, call feature or server functions, and shape the response. Do not hide product workflows in route handlers.
- The web app must call `services/ai-runtime` over HTTP for product API behavior. It must not access PostgreSQL, pgvector, or OpenAI directly.

## UI Product Stance

Ancora is a learning product, not a marketing site. App screens should be quiet, scannable, workflow-first, and responsive.

- Prefer usable product screens over landing-page composition.
- Avoid oversized hero sections for app workflows.
- Keep cards to repeated items, modals, or genuinely framed tools.
- Do not nest cards inside cards.
- Use stable grid tracks, min/max constraints, and fixed-format dimensions where dynamic content could shift layout.
- Ensure text fits on mobile and desktop without overlap or clipping.
- Keep private source material out of screenshots, fixtures, docs, logs, analytics, and client telemetry.

## Migration Policy

- Preserve route URLs and API contracts during structural moves.
- Move one feature at a time when migrating.
- Keep `app/` thin as behavior grows.
- Do not add a top-level `src/` layer to `apps/web`.
- Enforce naming with `pnpm --filter @ancora/web lint:naming` and broader checks with `pnpm lint`.
