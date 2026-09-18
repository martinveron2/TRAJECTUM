import pytest

from trajectum_core import AirfoilProfile


def test_naca4_profile_normalizes_designation_and_parameters():
    profile = AirfoilProfile.naca4("0012")
    assert profile.designation == "NACA 0012"
    assert profile.naca4_parameters == (0.0, 0.0, 0.12)


def test_cambered_naca4_parameters_are_exposed():
    profile = AirfoilProfile.naca4("NACA 2412")
    assert profile.naca4_parameters == (0.02, 0.4, 0.12)


def test_invalid_naca_designation_is_rejected():
    with pytest.raises(ValueError):
        AirfoilProfile.naca4("NACA 12")


def test_custom_profile_accepts_normalized_coordinates():
    profile = AirfoilProfile.custom(((1.0, 0.0), (0.5, 0.08), (0.0, 0.0), (0.5, -0.08)))
    assert profile.kind == "custom"
    assert len(profile.coordinates) == 4
