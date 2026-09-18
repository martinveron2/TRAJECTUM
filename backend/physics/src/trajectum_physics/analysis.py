from __future__ import annotations

from dataclasses import dataclass
from math import pi

from .aerodynamics import combine_cp, tangent_ogive_cp, trapezoidal_fin_set_cp
from .atmosphere import isa_troposphere
from .mass import MassPoint, center_of_gravity
from .propulsion import Motor
from .recovery import RecoveryConfig, simulate_recovery
from .stability import static_margin
from .trajectory import FlightConfig, simulate_to_apogee


@dataclass(frozen=True)
class EngineeringResult:
    total_mass_kg: float
    cg_x_m: float
    cp_x_m: float
    static_margin_calibers: float
    apogee_m: float
    time_to_apogee_s: float
    max_q_pa: float
    max_speed_m_s: float
    max_mach: float
    deployment_time_s: float | None
    deployment_altitude_m: float | None
    landing_time_s: float
    impact_speed_m_s: float

def analyze_vehicle(
    *,
    masses: tuple[MassPoint, ...],
    nose_length_m: float,
    body_diameter_m: float,
    fin_count: int,
    fin_root_chord_m: float,
    fin_tip_chord_m: float,
    fin_span_m: float,
    fin_sweep_m: float,
    fin_leading_edge_x_m: float,
    launch_angle_deg: float,
    cd: float,
    motor: Motor,
    parachute_cd: float = 1.5,
    parachute_area_m2: float = 0.20,
    deploy_altitude_m: float | None = None,
    deploy_delay_s: float = 0.0,
) -> EngineeringResult:
    mass = center_of_gravity(masses)
    nose = tangent_ogive_cp(nose_length_m)
    fins = trapezoidal_fin_set_cp(
        count=fin_count,
        body_diameter_m=body_diameter_m,
        span_m=fin_span_m,
        root_chord_m=fin_root_chord_m,
        tip_chord_m=fin_tip_chord_m,
        sweep_length_m=fin_sweep_m,
        leading_edge_x_m=fin_leading_edge_x_m,
    )
    cp = combine_cp(nose, fins)
    margin = static_margin(
        cg_x_m=mass.cg_x_m,
        cp_x_m=cp.x_cp_m,
        body_diameter_m=body_diameter_m,
    )
    wet_motor_mass = motor.dry_mass_kg + motor.propellant_mass_kg
    non_motor_mass = mass.total_mass_kg - wet_motor_mass
    if non_motor_mass <= 0:
        raise ValueError("Vehicle mass table must include motor plus positive non-motor mass.")

    trajectory = simulate_to_apogee(
        FlightConfig(
            launch_angle_deg=launch_angle_deg,
            reference_area_m2=pi * body_diameter_m**2 / 4.0,
            cd=cd,
            non_motor_mass_kg=non_motor_mass,
            motor=motor,
        )
    )
    max_speed = max(point.speed_m_s for point in trajectory.points)
    max_mach = max(
        point.speed_m_s / isa_troposphere(point.z_m).speed_of_sound_m_s
        for point in trajectory.points
    )

    recovery = simulate_recovery(
        RecoveryConfig(
            mass_kg=non_motor_mass + motor.dry_mass_kg,
            body_cd=cd,
            body_area_m2=pi * body_diameter_m**2 / 4.0,
            parachute_cd=parachute_cd,
            parachute_area_m2=parachute_area_m2,
            deploy_altitude_m=trajectory.apogee_m if deploy_altitude_m is None else deploy_altitude_m,
            deploy_delay_s=deploy_delay_s,
        ),
        initial_altitude_m=trajectory.apogee_m,
        initial_vertical_velocity_m_s=0.0,
        initial_time_s=trajectory.time_to_apogee_s,
    )

    return EngineeringResult(
        total_mass_kg=mass.total_mass_kg,
        cg_x_m=mass.cg_x_m,
        cp_x_m=cp.x_cp_m,
        static_margin_calibers=margin.calibers,
        apogee_m=trajectory.apogee_m,
        time_to_apogee_s=trajectory.time_to_apogee_s,
        max_q_pa=trajectory.max_q_pa,
        max_speed_m_s=max_speed,
        max_mach=max_mach,
        deployment_time_s=recovery.deployment_time_s,
        deployment_altitude_m=recovery.deployment_altitude_m,
        landing_time_s=recovery.landing_time_s,
        impact_speed_m_s=recovery.impact_speed_m_s,
    )
