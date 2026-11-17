"""Local service entry point. Credentials are read only inside create_app."""

import uvicorn


def main() -> None:
    uvicorn.run(
        "ancora.bootstrap:create_app",
        access_log=False,
        factory=True,
        host="127.0.0.1",
        port=8001,
    )


if __name__ == "__main__":
    main()
