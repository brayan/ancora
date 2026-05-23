#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

for arg in "$@"; do
  if [[ "$arg" == "--describe" ]]; then
    cat <<'EOF'
Task guards:
- Run fast blockers.
- Run the web scaffold test.
- Run the TypeScript eval-runner test.
- Run deterministic eval smoke.
EOF
    exit 0
  fi
done

scripts/ci/lanes/run-fast-blockers.sh
pnpm web:test
pnpm eval:test
pnpm eval:smoke >/dev/null
