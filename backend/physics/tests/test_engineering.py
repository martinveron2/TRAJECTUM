from math import isclose, pi

from trajectum_physics import (
    FlightConfig,
    MassPoint,
    Motor,
    center_of_gravity,
    combine_cp,
    isa_troposphere,
    simulate_to_apogee,
    static_margin,
    tangent_ogive_cp,
    trapezoidal_fin_set_cp,
)


def test_center_of_gravity_weighted_average():
    result = center_of_gravity((MassPoint("a", 1.0, 0.0), MassPoint("b", 3.0, 1.0)))
    assert isclose(result.total_mass_kg, 4.0)
    assert isclose(result.cg_x_m, 0.75)


def test_standard_atmosphere_sea_level_density():
    atmosphere = isa_troposphere(0.0)
    assert abs(atmosphere.density_kg_m3 - 1.225) < 0.01
    assert 339.0 < atmosphere.speed_of_sound_m_s < 342.0


def test_tangent_ogive_cp_location():
    nose = tangent_ogive_cp(0.180)
    assert isclose(nose.cn_alpha, 2.0)
    assert isclose(nose.x_cp_m, 0.08388, rel_tol=1e-12)


def test_fin_and_nose_cp_combination_is_weighted_by_cn_alpha():
    nose = tangent_ogive_cp(0.180)
    fins = trapezoidal_fin_set_cp(
        count=4,
        body_diameter_m=0.063,
        span_m=0.050,
        root_chord_m=0.080,
        tip_chord_m=0.040,
        sweep_length_m=0.020,
        leading_edge_x_m=0.760,
    )
    result = combine_cp(nose, fins)
    assert nose.x_cp_m < result.x_cp_m < fins.x_cp_m
    assert result.cn_alpha_total > nose.cn_alpha


def test_static_margin_sign_convention():
    result = static_margin(cg_x_m=0.50, cp_x_m=0.60, body_diameter_m=0.05)
    assert isclose(result.margin_m, 0.10)
    assert isclose(result.calibers, 2.0)


def test_trajectory_solver_produces_positive_apogee_and_max_q():
    motor = Motor(
        burn_time_s=0.5,
        total_impulse_n_s=207.0,
        propellant_mass_kg=0.140,
        dry_mass_kg=0.350,
    )
    area = pi * 0.063**2 / 4.0
    config = FlightConfig(
        launch_angle_deg=85.0,
        reference_area_m2=area,
        cd=0.55,
        non_motor_mass_kg=0.58,
        motor=motor,
        dt_s=0.01,
    )
    result = simulate_to_apogee(config)
    assert result.apogee_m > 0.0
    assert result.time_to_apogee_s > motor.burn_time_s
    assert result.max_q_pa > 0.0


def test_trajectory_time_step_convergence_is_reasonable():
    motor = Motor(0.5, 207.0, 0.140, 0.350)
    area = pi * 0.063**2 / 4.0
    coarse = simulate_to_apogee(FlightConfig(85.0, area, 0.55, 0.58, motor, dt_s=0.01))
    fine = simulate_to_apogee(FlightConfig(85.0, area, 0.55, 0.58, motor, dt_s=0.005))
    relative = abs(coarse.apogee_m - fine.apogee_m) / fine.apogee_m
    assert relative < 0.02
