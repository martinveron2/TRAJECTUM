from trajectum_physics import (
    axial_uniform_cg,
    tangent_ogive_shell_cg,
    trapezoidal_fin_planform_cg_x,
)


def test_uniform_component_cg_is_midpoint():
    assert axial_uniform_cg(x_start_m=0.18, x_end_m=0.86) == 0.52


def test_tangent_ogive_shell_matches_pdr_order_of_magnitude():
    x = tangent_ogive_shell_cg(length_m=0.18, base_radius_m=0.0275)
    assert 0.10 < x < 0.12


def test_trapezoidal_fin_cg_is_inside_planform():
    x = trapezoidal_fin_planform_cg_x(leading_edge_x_m=0.76, root_chord_m=0.08, tip_chord_m=0.04, span_m=0.05, sweep_m=0.02)
    assert 0.76 < x < 0.86
