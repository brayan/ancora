"""Authenticate before parsing and bound bytes without retaining request payloads."""

import secrets
from collections.abc import Mapping

from starlette.datastructures import Headers
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from ancora.shared.api.errors import validation_error_response


class TrustedServerBoundary:
    def __init__(
        self,
        app: ASGIApp,
        service_token: str | None,
        invalid_request_codes: Mapping[str, str],
    ) -> None:
        self.app = app
        self.service_token = service_token
        self.invalid_request_codes = invalid_request_codes

    async def __call__(
        self,
        scope: Scope,
        receive: Receive,
        send: Send,
    ) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        headers = Headers(scope=scope)
        if "origin" in headers:
            await JSONResponse({"error": "origin_forbidden"}, status_code=403)(
                scope, receive, send
            )
            return
        if self.service_token is None:
            await JSONResponse({"error": "generation_unavailable"}, status_code=503)(
                scope, receive, send
            )
            return
        supplied = headers.get("authorization", "").encode()
        expected = f"Bearer {self.service_token}".encode()
        if not secrets.compare_digest(supplied, expected):
            await JSONResponse({"error": "unauthorized"}, status_code=401)(
                scope, receive, send
            )
            return

        body = bytearray()
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            body.extend(message.get("body", b""))
            if len(body) > 200_000:
                response = validation_error_response(
                    self.invalid_request_codes, scope["path"], "request_too_large"
                )
                await response(scope, receive, send)
                return
            if not message.get("more_body", False):
                break

        delivered = False

        async def replay_body() -> Message:
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        await self.app(scope, replay_body, send)
