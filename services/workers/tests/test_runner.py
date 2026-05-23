from ancora_workers.runner import run_once


def test_run_once_is_idle_without_queue_infrastructure() -> None:
    assert run_once() == {"status": "idle", "jobs_checked": 0}
