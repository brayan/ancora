#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

for arg in "$@"; do
  if [[ "$arg" == "--describe" ]]; then
    cat <<'DESCRIPTION'
Task context guards:
- Verify local programming-practice guidance, ADR, plan and runner routing.
- Check deferred service and historical database boundaries.
- This governance lane does not execute Python or prove runner isolation.
DESCRIPTION
    exit 0
  fi
done

for file in AGENTS.md CONTEXT.md docs/agents/repo-manifest.yaml \
  docs/agents/projects/web.yaml docs/agents/projects/backend.yaml \
  docs/agents/projects/eval-runner.yaml docs/adr/0011-focus-on-local-programming-practice.md \
  docs/adr/0018-place-projects-at-root-and-use-operation-use-cases.md \
  docs/adr/0019-use-callable-python-use-cases.md \
  docs/product/programming-practice.md docs/exec-plans/programming-practice.md \
  docs/architecture/runner-spike.md web/package.json web/runner/worker.mjs \
  web/runner/protocol.mjs backend/pyproject.toml backend/src/ancora/main.py \
  tools/eval-runner/package.json docker/docker-compose.yml; do
  test -f "$file"
done

rg -q 'concept_generated' CONTEXT.md
rg -q 'No authentication|No auth|no login' AGENTS.md
rg -q 'Pydantic AI|Pydantic AI|Pydantic' docs/adr/0011-focus-on-local-programming-practice.md
rg -q 'PostgreSQL.*Drizzle' docs/adr/0011-focus-on-local-programming-practice.md
rg -q 'not.*attestation' docs/adr/0011-focus-on-local-programming-practice.md
