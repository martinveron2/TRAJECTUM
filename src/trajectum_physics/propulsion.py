from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Motor:
    burn_time_s: float
    total_impulse_n_s: float
    propellant_mass_kg: float
    dry_mass_kg: float

    @property
    def average_thrust_n(self) -> float:
        return self.total_impulse_n_s / self.burn_time_s


def rectangular_thrust(motor: Motor, t_s: float) -> float:
    """CDR placeholder when a measured thrust-time curve is unavailable."""
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
