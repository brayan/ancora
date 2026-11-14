#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

mode="${1:-all}"
if [[ $# -gt 1 ]]; then
  echo "Usage: $0 [lint|format|typecheck|test|all]" >&2
  exit 2
fi

case "$mode" in
  lint)
    uv run --frozen --all-packages ruff check .
    PYTHONDONTWRITEBYTECODE=1 uv run --frozen --all-packages python scripts/quality/python/check_parameter_layout.py \
      apps/practice-service apps/web/runner/harness.py apps/web/tests/python scripts/quality/python
    ;;
  format) uv run --frozen --all-packages ruff format --check . ;;
  typecheck) uv run --frozen --all-packages pyright ;;
  test) uv run --frozen --all-packages python -m pytest ;;
  all)
    "$0" lint
    "$0" format
    "$0" typecheck
    "$0" test
    ;;
  *)
    echo "Usage: $0 [lint|format|typecheck|test|all]" >&2
    exit 2
    ;;
esac
