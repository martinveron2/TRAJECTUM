import pytest

from trajectum_core import FinGeometry, RocketGeometry, TrajectumError, affected_modules


def test_current_axial_stack_is_consistent():
    geometry = RocketGeometry(860.0, 63.0, 180.0, 180.0, 500.0, 2.0)
    geometry.validate()


def test_inconsistent_axial_stack_is_rejected():
    geometry = RocketGeometry(861.0, 63.0, 180.0, 180.0, 500.0, 2.0)
    with pytest.raises(TrajectumError):
        geometry.validate()


def test_fin_geometry_reports_cp_blocker_until_tbd_fields_are_known():
    fins = FinGeometry(
        count=4,
        root_chord_mm=80.0,
        tip_chord_mm=None,
        span_mm=50.0,
        sweep_length_mm=None,
        leading_edge_x_mm=None,
    )
    assert not fins.is_complete_for_cp


def test_geometry_change_propagates_to_engineering_dependents():
    impacted = affected_modules({"geometry"})
    assert "mass" in impacted
    assert "aerodynamics" in impacted
    assert "cp" in impacted
    assert "trajectory" in impacted
    assert "reporting" in impacted
