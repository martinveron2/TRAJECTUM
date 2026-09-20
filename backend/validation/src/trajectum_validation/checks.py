from __future__ import annotations

from collections.abc import Iterable
from dataclasses import asdict, dataclass
from math import isfinite


@dataclass(frozen=True)
class ValidationResult:
    name: str
    reference: float
    candidate: float
    relative_error: float
    tolerance: float
    passed: bool


@dataclass(frozen=True)
class Tolerance:
    """Combined absolute and relative acceptance criterion."""

    absolute: float
    relative: float
    rationale: str

    def __post_init__(self) -> None:
        if any(not isfinite(value) or value < 0 for value in (self.absolute, self.relative)):
            raise ValueError("Tolerances must be finite and non-negative.")
        if not self.rationale.strip():
            raise ValueError("A tolerance rationale is required.")


@dataclass(frozen=True)
class ValidationEvidence:
    """Traceability chain attached to a validation comparison."""

    model: str
    input_sha256: str
    source: str
    assumptions: tuple[str, ...]
    validity: str
    version: str
    test_id: str

    def __post_init__(self) -> None:
        required = (self.model, self.source, self.validity, self.version, self.test_id)
        if any(not value.strip() for value in required):
            raise ValueError("The validation evidence chain must be complete.")
        if len(self.input_sha256) != 64 or any(
            character not in "0123456789abcdef" for character in self.input_sha256
        ):
            raise ValueError("input_sha256 must be a lowercase SHA-256 digest.")
        if not self.assumptions or any(not assumption.strip() for assumption in self.assumptions):
            raise ValueError("At least one explicit assumption is required.")


@dataclass(frozen=True)
class ComparisonResult:
    quantity: str
    unit: str
    actual: float
    expected: float
    absolute_error: float
    allowed_error: float
    passed: bool
    tolerance: Tolerance
    evidence: ValidationEvidence

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


def relative_error(reference: float, candidate: float) -> float:
    if not all(isfinite(value) for value in (reference, candidate)):
        raise ValueError("Reference and candidate must be finite.")
    if reference == 0:
        raise ValueError("Reference must be non-zero.")
    return abs(candidate - reference) / abs(reference)


def compare(name: str, reference: float, candidate: float, tolerance: float) -> ValidationResult:
    """Run the legacy one-tolerance comparison.

    ``tolerance`` remains relative when ``reference`` is non-zero.  For a zero
    reference, where relative error is undefined, it is interpreted as an
    absolute tolerance.  ``ValidationResult.relative_error`` is retained for
    API compatibility and contains the metric used by this comparison.
    """

    if not name.strip():
        raise ValueError("Comparison name is required.")
    if not isfinite(tolerance) or tolerance < 0:
        raise ValueError("Tolerance must be finite and non-negative.")
    if not all(isfinite(value) for value in (reference, candidate)):
        raise ValueError("Reference and candidate must be finite.")
    error = abs(candidate) if reference == 0 else relative_error(reference, candidate)
    return ValidationResult(name, reference, candidate, error, tolerance, error <= tolerance)


def compare_scalar(
    quantity: str,
    unit: str,
    actual: float,
    expected: float,
    tolerance: Tolerance,
    evidence: ValidationEvidence,
) -> ComparisonResult:
    """Compare one value, including a well-defined zero-reference case."""

    if not quantity.strip() or not unit.strip():
        raise ValueError("Quantity and unit are required; use '1' for dimensionless values.")
    if not all(isfinite(value) for value in (actual, expected)):
        raise ValueError("Cannot validate non-finite values.")
    absolute_error = abs(actual - expected)
    allowed_error = tolerance.absolute + tolerance.relative * abs(expected)
    if not all(isfinite(value) for value in (absolute_error, allowed_error)):
        raise ValueError("Comparison overflowed to a non-finite value.")
    return ComparisonResult(
        quantity=quantity,
        unit=unit,
        actual=actual,
        expected=expected,
        absolute_error=absolute_error,
        allowed_error=allowed_error,
        passed=absolute_error <= allowed_error,
        tolerance=tolerance,
        evidence=evidence,
    )


def compare_series(
    quantity: str,
    unit: str,
    actual: Iterable[float],
    expected: Iterable[float],
    tolerance: Tolerance,
    evidence: ValidationEvidence,
) -> tuple[ComparisonResult, ...]:
    """Compare pre-aligned samples; interpolation remains the caller's responsibility."""

    actual_values = tuple(actual)
    expected_values = tuple(expected)
    if not actual_values or len(actual_values) != len(expected_values):
        raise ValueError("Series must be non-empty and have equal lengths.")
    return tuple(
        compare_scalar(
            f"{quantity}[{index}]", unit, actual_value, expected_value, tolerance, evidence
        )
        for index, (actual_value, expected_value) in enumerate(
            zip(actual_values, expected_values, strict=True)
        )
    )
