# Shared Types

Practice contracts are type-only re-exports inferred from `@ancora/schemas`. Keep the runtime schemas canonical; do not duplicate their fields here. Backend orchestration and persistence stay in the owning application.

Run `pnpm --filter @ancora/shared-types typecheck`. JSON Schema export/check commands are documented in [schemas](../schemas/README.md).
