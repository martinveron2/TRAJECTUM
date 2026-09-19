from __future__ import annotations

from dataclasses import dataclass


A100_RN_KNDX_THRUST_CURVE: tuple[tuple[float, float], ...] = (
    (0.00, 0.0),
    (0.05, 600.0),
    (0.10, 550.0),
    (0.20, 530.0),
    (0.30, 500.0),
    (0.40, 400.0),
    (0.45, 50.0),
    (0.50, 0.0),
)

A100_RN_KNDX_OFFICIAL_AVERAGE_THRUST_N = 441.0


@dataclass(frozen=True)
class Motor:
    burn_time_s: float
    total_impulse_n_s: float
    propellant_mass_kg: float
    dry_mass_kg: float
    thrust_curve: tuple[tuple[float, float], ...] = ()
    official_average_thrust_n: float | None = None

    @property
    def average_thrust_n(self) -> float:
        return self.total_impulse_n_s / self.burn_time_s


def a100_rn_kndx_motor() -> Motor:
    """Official UTN-FRH A-100 RN / KNDX motor dataset used by FRR/LRR."""
    return Motor(
        burn_time_s=0.5,
        total_impulse_n_s=207.0,
        propellant_mass_kg=0.140,
        dry_mass_kg=0.350,
        thrust_curve=A100_RN_KNDX_THRUST_CURVE,
        official_average_thrust_n=A100_RN_KNDX_OFFICIAL_AVERAGE_THRUST_N,
    )


def curve_thrust(motor: Motor, t_s: float) -> float:
    """Linearly interpolate a measured thrust-time curve."""
    curve = motor.thrust_curve
    if not curve:
        return 0.0
    if t_s < curve[0][0] or t_s > curve[-1][0]:
        return 0.0
    if t_s == curve[-1][0]:
        return curve[-1][1]
    for (t0, f0), (t1, f1) in zip(curve, curve[1:]):
        if t0 <= t_s <= t1:
            if t1 == t0:
                return f1
            alpha = (t_s - t0) / (t1 - t0)
            return f0 + alpha * (f1 - f0)
    return 0.0


def rectangular_thrust(motor: Motor, t_s: float) -> float:
    """Use measured curve when available; otherwise use the legacy rectangular model."""
    if motor.thrust_curve:
        return curve_thrust(motor, t_s)
    if 0.0 <= t_s < motor.burn_time_s:
        return motor.average_thrust_n
    return 0.0


def motor_mass(motor: Motor, t_s: float) -> float:
    if t_s <= 0:
        return motor.dry_mass_kg + motor.propellant_mass_kg
    if t_s >= motor.burn_time_s:
        return motor.dry_mass_kg
    fraction_remaining = 1.0 - t_s / motor.burn_time_s
    return motor.dry_mass_kg + motor.propellant_mass_kg * fraction_remaining
