from .aerodynamics import (
    CPContribution,
    CPResult,
    combine_cp,
    tangent_ogive_cp,
    trapezoidal_fin_set_cp,
)
from .atmosphere import AtmosphereState, isa_troposphere
from .cdr import CDRRun, run_cdr_case
from .mass import MassPoint, MassProperties, center_of_gravity
from .propulsion import Motor, motor_mass, rectangular_thrust
from .stability import StaticMargin, static_margin
from .trajectory import FlightConfig, FlightPoint, FlightResult, simulate_to_apogee

__version__ = "0.1.0-dev0"

__all__ = [
    "AtmosphereState",
    "CDRRun",
    "CPContribution",
    "CPResult",
    "FlightConfig",
    "FlightPoint",
    "FlightResult",
    "MassPoint",
    "MassProperties",
    "Motor",
    "StaticMargin",
    "center_of_gravity",
    "combine_cp",
    "isa_troposphere",
    "motor_mass",
    "rectangular_thrust",
    "run_cdr_case",
    "simulate_to_apogee",
    "static_margin",
    "tangent_ogive_cp",
    "trapezoidal_fin_set_cp",
]
