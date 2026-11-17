#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

export PYTHONDONTWRITEBYTECODE=1

mode="${1:-all}"
if [[ $# -gt 1 ]]; then
  echo "Usage: $0 [lint|format|typecheck|test|architecture|all]" >&2
  exit 2
fi

case "$mode" in
  lint)
    uv run --frozen --all-packages ruff check .
    uv run --frozen --all-packages sailtech-check-parameters backend web/runner/harness.py web/tests/python
    uv run --frozen --all-packages sailtech-check-conditions backend web/runner/harness.py web/tests/python
    uv run --frozen --all-packages sailtech-check-class-spacing backend web/runner/harness.py web/tests/python
    uv run --frozen --all-packages sailtech-check-ordering backend web/runner/harness.py web/tests/python
    ;;
  format) uv run --frozen --all-packages ruff format --check . ;;
  typecheck) uv run --frozen --all-packages pyright ;;
  test) uv run --frozen --all-packages python -m pytest ;;
  architecture)
    uv run --frozen --all-packages tach check --exact
    uv run --frozen --all-packages sailtech-check-domain-imports --source-root backend/src
    ;;
  all)
    "$0" lint
    "$0" format
    "$0" typecheck
    "$0" architecture
    "$0" test
    ;;
  *)
    echo "Usage: $0 [lint|format|typecheck|test|architecture|all]" >&2
    exit 2
    ;;
esac
