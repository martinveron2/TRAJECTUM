from __future__ import annotations

from bisect import bisect_left
from dataclasses import dataclass
from math import ceil, pi

from .aerodynamics import CPContribution, combine_cp, tangent_ogive_cp, trapezoidal_fin_set_cp
from .atmosphere import isa_troposphere
from .mass import MassPoint, center_of_gravity
from .propulsion import Motor
from .recovery import RecoveryConfig, RecoveryPoint, RecoveryResult, simulate_recovery
from .stability import static_margin
from .trajectory import FlightConfig, FlightPoint, FlightResult, simulate_to_apogee


@dataclass(frozen=True)
class MissionSample:
    t_s: float
    phase: str
    x_m: float
    altitude_m: float
    speed_m_s: float
    vertical_speed_m_s: float
    mach: float
    q_pa: float
    acceleration_g: float
    parachute_deployed: bool


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
    mission_timeline: tuple[MissionSample, ...]


def _nearest_flight(points: tuple[FlightPoint, ...], t_s: float) -> FlightPoint:
    times = [p.t_s for p in points]
    idx = bisect_left(times, t_s)
    if idx <= 0:
        return points[0]
    if idx >= len(points):
        return points[-1]
    before, after = points[idx - 1], points[idx]
    return after if abs(after.t_s - t_s) < abs(before.t_s - t_s) else before


def _nearest_recovery(points: tuple[RecoveryPoint, ...], t_s: float) -> RecoveryPoint:
    times = [p.t_s for p in points]
    idx = bisect_left(times, t_s)
    if idx <= 0:
        return points[0]
    if idx >= len(points):
        return points[-1]
    before, after = points[idx - 1], points[idx]
    return after if abs(after.t_s - t_s) < abs(before.t_s - t_s) else before


def _build_mission_timeline(
    trajectory: FlightResult,
    recovery: RecoveryResult,
    *,
    motor_burn_time_s: float,
) -> tuple[MissionSample, ...]:
    samples: list[MissionSample] = []
    apex_x = max(trajectory.points, key=lambda p: p.z_m).x_m
    event_times = {
        0.0,
        motor_burn_time_s,
        trajectory.time_to_apogee_s,
        recovery.landing_time_s,
    }
    if recovery.deployment_time_s is not None:
        event_times.add(recovery.deployment_time_s)

    second_marks = {float(t) for t in range(ceil(recovery.landing_time_s) + 1)}
    for t in sorted(event_times | second_marks):
        if t <= trajectory.time_to_apogee_s:
            point = _nearest_flight(trajectory.points, t)
            if abs(t - trajectory.time_to_apogee_s) < 1e-6:
                phase = "APOGEE"
            elif t <= motor_burn_time_s:
                phase = "BOOST"
            else:
                phase = "COAST"
            samples.append(
                MissionSample(
                    t_s=t,
                    phase=phase,
                    x_m=point.x_m,
                    altitude_m=max(point.z_m, 0.0),
                    speed_m_s=point.speed_m_s,
                    vertical_speed_m_s=point.vz_m_s,
                    mach=point.speed_m_s / isa_troposphere(max(point.z_m, 0.0)).speed_of_sound_m_s,
                    q_pa=point.q_pa,
                    acceleration_g=point.acceleration_g,
                    parachute_deployed=False,
                )
            )
        else:
            point = _nearest_recovery(recovery.points, t)
            atmosphere = isa_troposphere(max(point.altitude_m, 0.0))
            q = 0.5 * atmosphere.density_kg_m3 * point.velocity_m_s**2
            phase = "PARACHUTE" if point.parachute_deployed else "DESCENT"
            if point.altitude_m <= 0.01:
                phase = "LANDED"
            samples.append(
                MissionSample(
                    t_s=t,
                    phase=phase,
                    x_m=apex_x,
                    altitude_m=max(point.altitude_m, 0.0),
                    speed_m_s=abs(point.velocity_m_s),
                    vertical_speed_m_s=point.velocity_m_s,
                    mach=abs(point.velocity_m_s) / atmosphere.speed_of_sound_m_s,
                    q_pa=q,
                    acceleration_g=point.acceleration_g,
                    parachute_deployed=point.parachute_deployed,
                )
            )
    return tuple(samples)


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
    nose_cp_contribution: CPContribution | None = None,
) -> EngineeringResult:
    mass = center_of_gravity(masses)
    nose = nose_cp_contribution or tangent_ogive_cp(nose_length_m)
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
    timeline = _build_mission_timeline(
        trajectory,
        recovery,
        motor_burn_time_s=motor.burn_time_s,
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
        mission_timeline=timeline,
    )
