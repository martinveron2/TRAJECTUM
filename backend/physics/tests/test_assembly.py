from trajectum_physics import AxialInterface, AxialPart, assemble_axially


PARTS = (
    AxialPart("nose", "Nose", 0.180),
    AxialPart("c1", "C1", 0.215),
    AxialPart("c2", "C2", 0.215),
    AxialPart("tail", "Tail", 0.225),
)


def test_axial_assembly_uses_verified_overlaps_instead_of_raw_length_sum():
    interfaces = (
        AxialInterface("nose", "c1", 0.010),
        AxialInterface("c1", "c2", 0.015),
        AxialInterface("c2", "tail", 0.020),
    )
    result = assemble_axially(PARTS, interfaces)

    assert result.resolved
    assert result.blockers == ()
    assert abs(result.total_length_m - 0.790) < 1e-12
    assert abs(result.stations[1].x_start_m - 0.170) < 1e-12


def test_axial_assembly_fails_closed_after_unknown_interface():
    interfaces = (
        AxialInterface("nose", "c1", None),
        AxialInterface("c1", "c2", 0.015),
        AxialInterface("c2", "tail", 0.020),
    )
    result = assemble_axially(PARTS, interfaces)

    assert not result.resolved
    assert result.total_length_m is None
    assert result.stations[0].x_start_m == 0.0
    assert result.stations[0].x_end_m == 0.180
    assert all(station.x_start_m is None for station in result.stations[1:])
    assert result.blockers == ("assembly.interfaces.nose_to_c1.overlap_mm",)
