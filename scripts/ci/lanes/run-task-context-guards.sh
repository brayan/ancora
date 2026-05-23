#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

if [[ "${1:-}" == "--describe" ]]; then
  cat <<'EOF'
Task context guards:
- Verify root guidance, manifest, project shards, ADRs, and scaffold entry points exist.
- Search for required architecture language and eval-runner routing.
- This lane is the current test-impact check for scaffold/governance changes.
EOF
  exit 0
fi

test -f AGENTS.md
test -f CONTEXT.md
test -f docs/agents/repo-manifest.yaml
test -f docs/agents/projects/web.yaml
test -f docs/agents/projects/ai-runtime.yaml
test -f docs/agents/projects/workers.yaml
test -f docs/agents/projects/eval-runner.yaml
test -f apps/web/package.json
test -f services/ai-runtime/pyproject.toml
test -f services/workers/pyproject.toml
test -f tools/eval-runner/pyproject.toml
test -f docker/docker-compose.yml
test -x scripts/ci/lanes/run-fast-blockers.sh
test -x scripts/ci/lanes/run-task-guards.sh
test -x scripts/ci/lanes/run-pr-guards.sh

rg -n "FastAPI|Next\\.js|OpenAI|account|pgvector|tools/eval-runner|source material" \
  AGENTS.md CONTEXT.md README.md docs/agents docs/adr docs/engineering docs/testing docs/ops >/dev/null
