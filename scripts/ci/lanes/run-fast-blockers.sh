#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

for arg in "$@"; do
  if [[ "$arg" == "--describe" ]]; then
    cat <<'EOF'
Fast blockers:
- Typecheck shared TypeScript packages.
- Lint and typecheck the Next.js web scaffold.
- Typecheck the TypeScript eval-runner scaffold.
- Validate Docker Compose syntax for PostgreSQL + pgvector.
EOF
    exit 0
  fi
done

pnpm packages:typecheck
pnpm web:lint
pnpm web:typecheck
pnpm eval:typecheck
pnpm docker:config >/dev/null
