import ast
import hashlib
import math
from pathlib import Path

import pytest

from trajectum_validation import (
    Tolerance,
    ValidationEvidence,
    compare,
    compare_scalar,
    compare_series,
    relative_error,
)


def evidence() -> ValidationEvidence:
    return ValidationEvidence(
        model="synthetic comparator fixture",
        input_sha256=hashlib.sha256(b"synthetic fixture").hexdigest(),
        source="analytical identity",
        assumptions=("synthetic values are pre-aligned",),
        validity="validation infrastructure only; not a flight result",
        version="fixture-v1",
        test_id="test_checks",
    )


def test_relative_error():
    assert abs(relative_error(100.0, 98.0) - 0.02) < 1e-12


def test_compare_records_pass_fail_and_tolerance():
    result = compare("benchmark", 100.0, 98.0, 0.03)
    assert result.passed
    assert result.tolerance == 0.03


def test_combined_tolerance_handles_zero_reference():
    tolerance = Tolerance(absolute=0.1, relative=0.01, rationale="synthetic boundary")
    assert compare_scalar("x", "m", 0.1, 0.0, tolerance, evidence()).passed
    assert not compare_scalar("x", "m", 0.10001, 0.0, tolerance, evidence()).passed
    assert compare_scalar("x", "m", 101.0, 100.0, tolerance, evidence()).passed


@pytest.mark.parametrize("bad_value", [math.nan, math.inf, -math.inf])
def test_non_finite_values_are_rejected(bad_value):
    with pytest.raises(ValueError):
        relative_error(1.0, bad_value)
    with pytest.raises(ValueError):
        compare_scalar(
            "x", "m", bad_value, 1.0, Tolerance(0.0, 0.0, "exact"), evidence()
        )


def test_non_finite_tolerances_are_rejected():
    with pytest.raises(ValueError):
        Tolerance(math.nan, 0.0, "invalid")
    with pytest.raises(ValueError):
        compare("x", 1.0, 1.0, math.inf)


@pytest.mark.parametrize("actual, expected", [([], []), ([1.0], [1.0, 2.0])])
def test_series_shape_is_explicit(actual, expected):
    with pytest.raises(ValueError):
        compare_series("x", "m", actual, expected, Tolerance(0.0, 0.0, "exact"), evidence())


def test_series_preserves_traceability():
    results = compare_series(
        "x", "m", [1.0, 3.0], [1.0, 2.0], Tolerance(0.0, 0.0, "exact"), evidence()
    )
    assert [result.passed for result in results] == [True, False]
    assert results[0].to_dict()["evidence"]["test_id"] == "test_checks"


def test_incomplete_evidence_is_rejected():
    with pytest.raises(ValueError):
        ValidationEvidence("model", "not-a-hash", "source", (), "validity", "v1", "test")


def test_validation_layer_does_not_import_production_models():
    source_root = Path(__file__).resolve().parents[1] / "src"
    forbidden = ("trajectum_core", "trajectum_physics", "trajectum_cad")
    for source_file in source_root.rglob("*.py"):
        for node in ast.walk(ast.parse(source_file.read_text())):
            if isinstance(node, ast.Import):
                imported = [alias.name for alias in node.names]
            elif isinstance(node, ast.ImportFrom):
                imported = [node.module or ""]
            else:
                imported = []
            assert not any(name.startswith(forbidden) for name in imported)
