# Eval Runner

## Start Here

This module is Ancora's internal eval CLI and artifact boundary. It is not a deployable service and it must use synthetic or explicitly approved eval material only.

Useful commands:

```bash
cd tools/eval-runner
uv run --project . --group dev ruff check .
uv run --project . --group dev pytest
uv run --project . ancora-eval-runner --smoke
```

The current smoke command returns a deterministic empty synthetic result. Future eval datasets, rubrics, fixtures, and reports belong under `evals`.
