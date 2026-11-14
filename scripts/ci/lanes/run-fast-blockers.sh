#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

for arg in "$@"; do
  if [[ "$arg" == "--describe" ]]; then
    cat <<'EOF'
Fast blockers:
- Check shared formatting, conventions, file roles, imports and architecture.
- Typecheck shared TypeScript packages.
- Typecheck the Next.js web app.
- Typecheck the TypeScript eval-runner scaffold.
- Validate Docker Compose syntax for PostgreSQL + pgvector.
EOF
    exit 0
  fi
done

pnpm code:check
pnpm packages:typecheck
pnpm web:typecheck
pnpm eval:typecheck
pnpm docker:config >/dev/null
