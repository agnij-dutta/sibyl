"""Django integration for Sibyl."""

import sibyl


class SibylDjangoMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            response = self.get_response(request)
            if response.status_code >= 500:
                sibyl.capture_message(
                    f"{request.method} {request.path} returned {response.status_code}",
                    level="error",
                    url=request.build_absolute_uri(),
                    method=request.method,
                    status_code=response.status_code,
                )
            return response
        except Exception as exc:
            sibyl.capture_exception(
                exc,
                mechanism="django",
                url=request.build_absolute_uri(),
                method=request.method,
            )
            raise

    def process_exception(self, request, exception):
        sibyl.capture_exception(
            exception,
            mechanism="django",
            url=request.build_absolute_uri(),
            method=request.method,
        )
        return None
