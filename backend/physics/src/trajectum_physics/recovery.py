from __future__ import annotations

from dataclasses import dataclass
from math import copysign

from .atmosphere import G0, isa_troposphere


@dataclass(frozen=True)
class RecoveryConfig:
    mass_kg: float
    body_cd: float
    body_area_m2: float
    parachute_cd: float
    parachute_area_m2: float
    deploy_altitude_m: float
    deploy_delay_s: float = 0.0
    dt_s: float = 0.002
    max_time_s: float = 300.0


@dataclass(frozen=True)
class RecoveryPoint:
    t_s: float
    altitude_m: float
    velocity_m_s: float
    parachute_deployed: bool
    acceleration_g: float


@dataclass(frozen=True)
class RecoveryResult:
    deployment_time_s: float | None
    deployment_altitude_m: float | None
    landing_time_s: float
    impact_speed_m_s: float
    max_descent_speed_m_s: float
    points: tuple[RecoveryPoint, ...]


def simulate_recovery(
    cfg: RecoveryConfig,
    *,
    initial_altitude_m: float,
    initial_vertical_velocity_m_s: float = 0.0,
    initial_time_s: float = 0.0,
) -> RecoveryResult:
    if cfg.mass_kg <= 0:
        raise ValueError("Recovery mass must be positive.")
    if cfg.body_cd < 0 or cfg.parachute_cd <= 0:
        raise ValueError("Drag coefficients must be non-negative and parachute Cd positive.")
    if cfg.body_area_m2 <= 0 or cfg.parachute_area_m2 <= 0:
        raise ValueError("Reference areas must be positive.")
    if initial_altitude_m < 0:
        raise ValueError("Initial altitude cannot be negative.")

    t = initial_time_s
    z = initial_altitude_m
    vz = initial_vertical_velocity_m_s
    deployed = False
    deploy_eligible_since: float | None = None
    deployment_time: float | None = None
    deployment_altitude: float | None = None
    max_descent = 0.0
    az = -G0
    points: list[RecoveryPoint] = []

    while t - initial_time_s <= cfg.max_time_s and z > 0:
        descending = vz <= 0.0
        below_trigger = z <= cfg.deploy_altitude_m

        if descending and below_trigger and deploy_eligible_since is None:
            deploy_eligible_since = t

        if (
            not deployed
            and deploy_eligible_since is not None
            and t - deploy_eligible_since >= cfg.deploy_delay_s
        ):
            deployed = True
            deployment_time = t
            deployment_altitude = z

        atmosphere = isa_troposphere(max(z, 0.0))
        cd = cfg.parachute_cd if deployed else cfg.body_cd
        area = cfg.parachute_area_m2 if deployed else cfg.body_area_m2
        drag_mag = 0.5 * atmosphere.density_kg_m3 * vz * vz * cd * area
        drag_acc = drag_mag / cfg.mass_kg
        az = -G0 if abs(vz) < 1e-12 else -G0 - copysign(drag_acc, vz)

        points.append(RecoveryPoint(t, z, vz, deployed, abs(az) / G0))
        max_descent = max(max_descent, max(-vz, 0.0))

        vz += az * cfg.dt_s
        z += vz * cfg.dt_s
        t += cfg.dt_s

    impact_speed = max(-vz, 0.0)
    points.append(RecoveryPoint(t, max(z, 0.0), vz, deployed, abs(az) / G0))
    return RecoveryResult(
        deployment_time_s=deployment_time,
        deployment_altitude_m=deployment_altitude,
        landing_time_s=t,
        impact_speed_m_s=impact_speed,
        max_descent_speed_m_s=max_descent,
        points=tuple(points),
    )
