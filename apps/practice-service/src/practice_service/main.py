"""Local service entry point. Credentials are read only inside create_app."""

import uvicorn


def main() -> None:
    uvicorn.run(
        "practice_service.http:create_app",
        factory=True,
        host="127.0.0.1",
        port=8001,
        access_log=False,
    )


if __name__ == "__main__":
    main()
