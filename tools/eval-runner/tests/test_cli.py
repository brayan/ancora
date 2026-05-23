from ancora_eval_runner.cli import run_smoke


def test_smoke_result_is_deterministic_and_synthetic() -> None:
    assert run_smoke() == {
        "checks": [],
        "dataset": "synthetic-empty",
        "status": "ok",
        "suite": "smoke",
    }
