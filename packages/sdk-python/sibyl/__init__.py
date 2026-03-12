"""Sibyl SDK for Python — AI-native incident investigation."""

from sibyl.client import SibylClient
from sibyl.types import SibylConfig

_client: SibylClient | None = None


def init(dsn: str, **kwargs) -> SibylClient:
    """Initialize the Sibyl SDK.

    Usage:
        import sibyl
        sibyl.init(dsn="https://key@sibyl.dev/1")
    """
    global _client
    config = SibylConfig(dsn=dsn, **kwargs)
    _client = SibylClient(config)
    _client.install_hooks()
    return _client


def capture_exception(error: BaseException, **context) -> str:
    """Capture an exception."""
    if not _client:
        raise RuntimeError("sibyl.init() must be called first")
    return _client.capture_exception(error, context)


def capture_message(message: str, level: str = "info", **context) -> str:
    """Capture a message."""
    if not _client:
        raise RuntimeError("sibyl.init() must be called first")
    return _client.capture_message(message, level, context)


def flush() -> None:
    """Flush pending events."""
    if _client:
        _client.flush()


def close() -> None:
    """Close the SDK and flush remaining events."""
    global _client
    if _client:
        _client.close()
        _client = None


def get_client() -> SibylClient | None:
    """Get the current client instance."""
    return _client
