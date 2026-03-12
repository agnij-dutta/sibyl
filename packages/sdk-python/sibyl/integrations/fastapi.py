"""FastAPI integration for Sibyl."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

import sibyl


class SibylMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            if response.status_code >= 500:
                sibyl.capture_message(
                    f"{request.method} {request.url.path} returned {response.status_code}",
                    level="error",
                    url=str(request.url),
                    method=request.method,
                    status_code=response.status_code,
                )
            return response
        except Exception as exc:
            sibyl.capture_exception(
                exc,
                mechanism="fastapi",
                url=str(request.url),
                method=request.method,
            )
            raise
