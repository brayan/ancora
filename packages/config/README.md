# Config Package

Shared non-secret configuration and portable code conventions. Runtime secrets belong in environment variables and `.env.example` templates.

- `ancora-check-next-filenames` checks Next.js filenames, component/hook exports and dynamic segments from the caller's working directory.
- `@ancora/config/eslint` provides Ancora's braces, conditional-call, test-title and empty-line rules. The web/root flat configs apply them.
- `pnpm --filter @ancora/config test` runs synthetic positive/negative fixtures.
- `pnpm --filter @ancora/config typecheck` checks the typed configuration surface.

The filename CLI is adapted from Sailtech's shared web config. See [code quality conventions](../../docs/engineering/code-quality-conventions.md) for provenance, local adaptations and refresh instructions. Validation requires neither a Sailtech nor an engineering-playbook checkout.
