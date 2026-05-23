#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

for arg in "$@"; do
  if [[ "$arg" == "--describe" ]]; then
    cat <<'EOF'
PR guards:
- Run task context guards.
- Run task guards.
EOF
    exit 0
  fi
done

scripts/ci/lanes/run-task-context-guards.sh
scripts/ci/lanes/run-task-guards.sh
