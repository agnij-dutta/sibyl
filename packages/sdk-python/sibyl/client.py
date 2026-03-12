"""Sibyl Python SDK client."""

import sys
import uuid
import threading
import traceback
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx

from sibyl.types import SibylConfig, SibylEvent, ParsedDSN


class SibylClient:
    def __init__(self, config: SibylConfig):
        self.config = config
        self.dsn = self._parse_dsn(config.dsn)
        self._event_buffer: list[dict] = []
        self._lock = threading.Lock()
        self._timer: threading.Timer | None = None
        self._original_excepthook = None
        self._start_flush_timer()

    def _parse_dsn(self, dsn: str) -> ParsedDSN:
        parsed = urlparse(dsn)
        return ParsedDSN(
            protocol=parsed.scheme,
            public_key=parsed.username or "",
            host=parsed.hostname or "",
            project_id=parsed.path.lstrip("/"),
        )

    def _get_ingest_url(self) -> str:
        return f"{self.dsn.protocol}://{self.dsn.host}/v1/ingest"

    def _start_flush_timer(self):
        self._timer = threading.Timer(self.config.flush_interval, self._flush_and_restart)
        self._timer.daemon = True
        self._timer.start()

    def _flush_and_restart(self):
        self.flush()
        self._start_flush_timer()

    def install_hooks(self):
        """Install global exception hooks."""
        self._original_excepthook = sys.excepthook

        def excepthook(exc_type, exc_value, exc_tb):
            self.capture_exception(exc_value, {"mechanism": "excepthook"})
            self.flush()
            if self._original_excepthook:
                self._original_excepthook(exc_type, exc_value, exc_tb)

        sys.excepthook = excepthook

    def capture_exception(self, error: BaseException, context: dict | None = None) -> str:
        event_id = uuid.uuid4().hex[:24]
        context = context or {}

        event = SibylEvent(
            event_id=event_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            level="error",
            message=str(error),
            environment=self.config.environment,
            metadata={
                **context,
                "type": type(error).__name__,
                "traceback": traceback.format_exception(type(error), error, error.__traceback__),
            },
        )

        self._add_event(event)
        return event_id

    def capture_message(self, message: str, level: str = "info", context: dict | None = None) -> str:
        event_id = uuid.uuid4().hex[:24]

        event = SibylEvent(
            event_id=event_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            level=level,
            message=message,
            environment=self.config.environment,
            metadata=context or {},
        )

        self._add_event(event)
        return event_id

    def _add_event(self, event: SibylEvent):
        import random
        if random.random() > self.config.sample_rate:
            return

        with self._lock:
            self._event_buffer.append(self._event_to_dict(event))

        if len(self._event_buffer) >= self.config.max_batch_size:
            self.flush()

    def _event_to_dict(self, event: SibylEvent) -> dict:
        return {
            "event_id": event.event_id,
            "timestamp": event.timestamp,
            "level": event.level,
            "message": event.message,
            "service": event.service,
            "environment": event.environment,
            "fingerprint": event.fingerprint,
            "trace_id": event.trace_id,
            "span_id": event.span_id,
            "user_id": event.user_id,
            "metadata": str(event.metadata),
            "sdk_name": event.sdk_name,
            "sdk_version": event.sdk_version,
        }

    def flush(self):
        with self._lock:
            events = self._event_buffer[:]
            self._event_buffer.clear()

        if not events:
            return

        try:
            with httpx.Client(timeout=10) as client:
                client.post(
                    self._get_ingest_url(),
                    json={"events": events, "spans": []},
                    headers={
                        "Authorization": f"Bearer {self.dsn.public_key}",
                        "X-Sibyl-Project": self.dsn.project_id,
                    },
                )
        except Exception as e:
            if self.config.debug:
                print(f"[Sibyl] Flush error: {e}")
            # Re-add events on failure
            with self._lock:
                self._event_buffer = events + self._event_buffer

    def close(self):
        if self._timer:
            self._timer.cancel()
            self._timer = None
        self.flush()
        if self._original_excepthook:
            sys.excepthook = self._original_excepthook
