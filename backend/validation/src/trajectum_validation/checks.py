from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ValidationResult:
    name: str
    reference: float
    candidate: float
    relative_error: float
    tolerance: float
    passed: bool


def relative_error(reference: float, candidate: float) -> float:
    if reference == 0:
        raise ValueError("Reference must be non-zero.")
    return abs(candidate - reference) / abs(reference)


def compare(name: str, reference: float, candidate: float, tolerance: float) -> ValidationResult:
    if tolerance < 0:
        raise ValueError("Tolerance must be non-negative.")
    error = relative_error(reference, candidate)
    return ValidationResult(name, reference, candidate, error, tolerance, error <= tolerance)
