# Schemas Package

`src/practice.ts` owns versioned runtime schemas for the fixed-practice API. Zod validates both requests and browser responses; TypeScript contracts are inferred from these schemas and re-exported by `@ancora/shared-types`.

`practice-v1.schema.json` is generated. Run `pnpm contracts:generate` after changing the canonical schemas; `pnpm contracts:check` rejects drift. Do not edit the generated file by hand. Runner reports also pass the bounded runner-protocol validator; JSON Schema alone does not validate execution evidence.

`pnpm --filter @ancora/schemas typecheck` checks this package. Python consumers remain future work; no Python service owns a separate product schema or database migration.
