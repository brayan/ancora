# Eval Runner

## Start Here

This module is Ancora's internal eval CLI and artifact boundary. It is not a deployable service and it must use synthetic or explicitly approved eval material only.

Useful commands:

```bash
pnpm --filter @ancora/eval-runner typecheck
pnpm --filter @ancora/eval-runner test
pnpm --filter @ancora/eval-runner smoke
```

The current smoke command returns a deterministic empty synthetic result. Future eval datasets, rubrics, fixtures, and reports belong under `evals`.
