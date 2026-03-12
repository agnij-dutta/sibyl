"""Type definitions for the Sibyl Python SDK."""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class SibylConfig:
    dsn: str
    environment: str = ""
    release: str = ""
    debug: bool = False
    sample_rate: float = 1.0
    max_batch_size: int = 50
    flush_interval: float = 5.0


@dataclass
class ParsedDSN:
    protocol: str
    public_key: str
    host: str
    project_id: str


@dataclass
class SibylEvent:
    event_id: str
    timestamp: str
    level: str
    message: str
    service: str = ""
    environment: str = ""
    fingerprint: str = ""
    trace_id: str = ""
    span_id: str = ""
    user_id: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)
    sdk_name: str = "sibyl-python"
    sdk_version: str = "0.1.0"
