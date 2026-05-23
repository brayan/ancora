from __future__ import annotations

import argparse
import json
from collections.abc import Sequence


def run_smoke() -> dict[str, object]:
    return {
        "checks": [],
        "dataset": "synthetic-empty",
        "status": "ok",
        "suite": "smoke",
    }


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run Ancora eval suites.")
    parser.add_argument("--smoke", action="store_true", help="Run the deterministic smoke suite.")
    args = parser.parse_args(argv)

    if args.smoke:
        print(json.dumps(run_smoke(), sort_keys=True))
        return 0

    parser.print_help()
    return 0
