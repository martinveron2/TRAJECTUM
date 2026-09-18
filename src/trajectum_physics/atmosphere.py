from __future__ import annotations

from dataclasses import dataclass
from math import sqrt

G0 = 9.80665
R_AIR = 287.05287
GAMMA = 1.4
T0 = 288.15
P0 = 101325.0
LAPSE = -0.0065


@dataclass(frozen=True)
class AtmosphereState:
    altitude_m: float
    temperature_k: float
    pressure_pa: float
    density_kg_m3: float
    speed_of_sound_m_s: float


def isa_troposphere(altitude_m: float) -> AtmosphereState:
    h = max(0.0, altitude_m)
    if h > 11000:
        raise ValueError("Initial TRAJECTUM ISA model is valid only through 11 km.")
    t = T0 + LAPSE * h
    exponent = -G0 / (LAPSE * R_AIR)
    p = P0 * (t / T0) ** exponent
    rho = p / (R_AIR * t)
    a = sqrt(GAMMA * R_AIR * t)
    return AtmosphereState(h, t, p, rho, a)
