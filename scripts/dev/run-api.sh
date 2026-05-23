#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR/services/ai-runtime"

uv run --project . uvicorn ancora_ai_runtime.main:app --app-dir src --reload
