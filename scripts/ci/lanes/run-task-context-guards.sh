#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

for arg in "$@"; do
  if [[ "$arg" == "--describe" ]]; then
    cat <<'EOF'
Task context guards:
- Verify root guidance, manifest, project shards, ADRs, and scaffold entry points exist.
- Search for required architecture language and eval-runner routing.
- This lane is the current test-impact check for scaffold/governance changes.
EOF
    exit 0
  fi
done

test -f AGENTS.md
test -f CONTEXT.md
test -f docs/agents/repo-manifest.yaml
test -f docs/agents/projects/web.yaml
test -f docs/agents/projects/eval-runner.yaml
test -f docs/adr/0009-nextjs-typescript-owns-v1-product-and-ai-runtime.md
test -f docs/adr/0010-defer-python-runtime-to-later-research-and-tooling.md
test -f apps/web/package.json
test -f apps/web/server/ai-runtime/README.md
test -f tools/eval-runner/package.json
test -f docker/docker-compose.yml
test -x scripts/ci/lanes/run-fast-blockers.sh
test -x scripts/ci/lanes/run-task-guards.sh
test -x scripts/ci/lanes/run-pr-guards.sh

rg -n "Next\\.js|TypeScript|OpenAI|account|pgvector|tools/eval-runner|source material|Python.*deferred" \
  AGENTS.md CONTEXT.md README.md docs/agents docs/adr docs/engineering docs/testing docs/ops >/dev/null
