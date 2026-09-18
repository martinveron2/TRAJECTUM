from trajectum_physics import MassPoint, Motor, analyze_vehicle


def test_full_engineering_pipeline_returns_finite_results():
    result = analyze_vehicle(
        masses=(
            MassPoint('nose', 0.100, 0.1114),
            MassPoint('fins', 0.020, 0.8222),
            MassPoint('body', 0.330, 0.5200),
            MassPoint('motor', 0.490, 0.7650),
            MassPoint('parachute', 0.030, 0.2000),
            MassPoint('payload', 0.100, 0.2250),
        ),
        nose_length_m=0.180,
        body_diameter_m=0.063,
        fin_count=4,
        fin_root_chord_m=0.080,
        fin_tip_chord_m=0.040,
        fin_span_m=0.050,
        fin_sweep_m=0.020,
        fin_leading_edge_x_m=0.760,
        launch_angle_deg=85.0,
        cd=0.55,
        motor=Motor(0.5, 207.0, 0.140, 0.350),
    )
    assert 1.06 < result.total_mass_kg < 1.08
    assert 0.55 < result.cg_x_m < 0.58
    assert result.cp_x_m > 0
    assert result.apogee_m > 0
    assert result.max_q_pa > 0
    assert result.max_speed_m_s > 0
    assert result.max_mach > 0
