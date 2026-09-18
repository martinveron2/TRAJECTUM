from trajectum_physics import RecoveryConfig, simulate_recovery


def test_parachute_deploys_and_lands():
    result = simulate_recovery(
        RecoveryConfig(
            mass_kg=0.93,
            body_cd=0.55,
            body_area_m2=0.00312,
            parachute_cd=1.5,
            parachute_area_m2=0.20,
            deploy_altitude_m=100.0,
            dt_s=0.005,
        ),
        initial_altitude_m=180.0,
    )
    assert result.deployment_time_s is not None
    assert result.deployment_altitude_m is not None
    assert 0 < result.deployment_altitude_m <= 100.5
    assert result.landing_time_s > result.deployment_time_s
    assert result.impact_speed_m_s > 0
    assert result.impact_speed_m_s < 15
