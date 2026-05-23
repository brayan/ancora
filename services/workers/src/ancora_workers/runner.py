from __future__ import annotations

import json


def run_once() -> dict[str, object]:
    return {"status": "idle", "jobs_checked": 0}


def main() -> None:
    print(json.dumps(run_once(), sort_keys=True))
