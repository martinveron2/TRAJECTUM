from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class ErrorCode(str, Enum):
    INVALID_GEOMETRY = "INVALID_GEOMETRY"
    INVALID_MASS = "INVALID_MASS"
    MISSING_INPUT = "MISSING_INPUT"
    INVALID_CONFIGURATION = "INVALID_CONFIGURATION"
    MODEL_OUT_OF_RANGE = "MODEL_OUT_OF_RANGE"


@dataclass(frozen=True)
class TrajectumError(Exception):
    code: ErrorCode
    message: str
    module: str
    severity: str = "error"
    context: dict[str, object] | None = None

    def __str__(self) -> str:
        return f"[{self.code}] {self.module}: {self.message}"
