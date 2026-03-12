"""Python logging integration for Sibyl."""

import logging
import sibyl


class SibylHandler(logging.Handler):
    """Sends log records above a threshold to Sibyl."""

    LEVEL_MAP = {
        logging.DEBUG: "debug",
        logging.INFO: "info",
        logging.WARNING: "warning",
        logging.ERROR: "error",
        logging.CRITICAL: "error",
    }

    def __init__(self, level=logging.ERROR):
        super().__init__(level)

    def emit(self, record: logging.LogRecord):
        try:
            level = self.LEVEL_MAP.get(record.levelno, "info")

            if record.exc_info and record.exc_info[1]:
                sibyl.capture_exception(
                    record.exc_info[1],
                    mechanism="logging",
                    logger=record.name,
                    module=record.module,
                )
            else:
                sibyl.capture_message(
                    record.getMessage(),
                    level=level,
                    logger=record.name,
                    module=record.module,
                    funcName=record.funcName,
                    lineno=record.lineno,
                )
        except Exception:
            self.handleError(record)
