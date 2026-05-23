#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

if [[ "${1:-}" == "--describe" ]]; then
  cat <<'EOF'
Task guards:
- Run fast blockers.
- Run the web scaffold test.
- Run ai-runtime, workers, and eval-runner Python tests.
- Run deterministic eval smoke.
EOF
  exit 0
fi

scripts/ci/lanes/run-fast-blockers.sh
pnpm web:test
pnpm api:test
pnpm workers:test
pnpm eval:test
pnpm eval:smoke >/dev/null
