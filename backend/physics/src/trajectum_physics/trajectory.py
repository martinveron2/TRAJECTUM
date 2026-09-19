from __future__ import annotations

from dataclasses import dataclass
from math import cos, hypot, radians, sin

from .atmosphere import G0, isa_troposphere
from .propulsion import Motor, motor_mass, rectangular_thrust


@dataclass(frozen=True)
class FlightConfig:
    launch_angle_deg: float
    reference_area_m2: float
    cd: float
    non_motor_mass_kg: float
    motor: Motor
    dt_s: float = 0.002
    max_time_s: float = 60.0


@dataclass(frozen=True)
class FlightPoint:
    t_s: float
    x_m: float
    z_m: float
    vx_m_s: float
    vz_m_s: float
    speed_m_s: float
    mass_kg: float
    q_pa: float
    acceleration_g: float


@dataclass(frozen=True)
class FlightResult:
    apogee_m: float
    time_to_apogee_s: float
    max_q_pa: float
    points: tuple[FlightPoint, ...]


def simulate_to_apogee(cfg: FlightConfig) -> FlightResult:
    if cfg.reference_area_m2 <= 0 or cfg.cd < 0 or cfg.non_motor_mass_kg <= 0:
        raise ValueError("Invalid trajectory configuration.")

    theta = radians(cfg.launch_angle_deg)
    ux, uz = cos(theta), sin(theta)
    dt = cfg.dt_s
    t = x = z = vx = vz = 0.0
    points: list[FlightPoint] = []
    max_q = 0.0

    def derivatives(state: tuple[float, float, float, float], time_s: float):
        _x, z_, vx_, vz_ = state
        speed = hypot(vx_, vz_)
        atmosphere = isa_troposphere(max(z_, 0.0))
        mass = cfg.non_motor_mass_kg + motor_mass(cfg.motor, time_s)
        thrust = rectangular_thrust(cfg.motor, time_s)
        drag = 0.5 * atmosphere.density_kg_m3 * speed**2 * cfg.cd * cfg.reference_area_m2
        if speed > 1e-12:
            drag_x = drag * vx_ / speed
            drag_z = drag * vz_ / speed
        else:
            drag_x = drag_z = 0.0
        ax = (thrust * ux - drag_x) / mass
        az = (thrust * uz - drag_z) / mass - G0
        return vx_, vz_, ax, az

    while t <= cfg.max_time_s:
        speed = hypot(vx, vz)
        atmosphere = isa_troposphere(max(z, 0.0))
        q = 0.5 * atmosphere.density_kg_m3 * speed**2
        max_q = max(max_q, q)
        mass = cfg.non_motor_mass_kg + motor_mass(cfg.motor, t)
        _, _, ax_now, az_now = derivatives((x, z, vx, vz), t)
        acceleration_g = hypot(ax_now, az_now) / G0
        points.append(FlightPoint(t, x, z, vx, vz, speed, mass, q, acceleration_g))

        if t > cfg.motor.burn_time_s and vz <= 0 and z > 0:
            break

        state = (x, z, vx, vz)
        k1 = derivatives(state, t)
        s2 = tuple(state[i] + 0.5 * dt * k1[i] for i in range(4))
        k2 = derivatives(s2, t + 0.5 * dt)
        s3 = tuple(state[i] + 0.5 * dt * k2[i] for i in range(4))
        k3 = derivatives(s3, t + 0.5 * dt)
        s4 = tuple(state[i] + dt * k3[i] for i in range(4))
        k4 = derivatives(s4, t + dt)

        x, z, vx, vz = tuple(
            state[i] + dt * (k1[i] + 2*k2[i] + 2*k3[i] + k4[i]) / 6.0
            for i in range(4)
        )
        t += dt

    apex = max(points, key=lambda p: p.z_m)
    return FlightResult(apex.z_m, apex.t_s, max_q, tuple(points))
