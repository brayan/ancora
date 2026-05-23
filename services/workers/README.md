# Workers

## Start Here

This module is a placeholder Python worker boundary for later async jobs. Redis, queue infrastructure, uploaded file ingestion, and background architecture changes remain deferred until an ADR approves them.

Useful commands:

```bash
cd services/workers
uv run --project . --group dev ruff check .
uv run --project . --group dev pytest
uv run --project . ancora-worker
```

Current behavior is a deterministic idle run so guard lanes can validate the boundary without introducing infrastructure.
