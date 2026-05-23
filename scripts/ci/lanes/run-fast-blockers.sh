#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

if [[ "${1:-}" == "--describe" ]]; then
  cat <<'EOF'
Fast blockers:
- Typecheck shared TypeScript packages.
- Lint and typecheck the Next.js web scaffold.
- Ruff-check ai-runtime, workers, and eval-runner Python boundaries.
- Validate Docker Compose syntax for PostgreSQL + pgvector.
EOF
  exit 0
fi

pnpm packages:typecheck
pnpm web:lint
pnpm web:typecheck
pnpm api:lint
pnpm workers:lint
pnpm eval:lint
pnpm docker:config >/dev/null
