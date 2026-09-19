from .aerodynamics import (
    CPContribution,
    CPResult,
    axisymmetric_nose_cp_from_profile,
    combine_cp,
    tangent_ogive_cp,
    trapezoidal_fin_set_cp,
)
from .analysis import EngineeringResult, MissionSample, analyze_vehicle
from .atmosphere import AtmosphereState, isa_troposphere
from .cdr import CDRRun, run_cdr_case
from .components import (
    ComponentMassProperty,
    axial_uniform_cg,
    axisymmetric_shell_cg_from_profile,
    combine_component_mass_properties,
    tangent_ogive_shell_cg,
    trapezoidal_fin_planform_cg_x,
)
from .mass import MassPoint, MassProperties, center_of_gravity
from .propulsion import (
    A100_RN_KNDX_OFFICIAL_AVERAGE_THRUST_N,
    A100_RN_KNDX_THRUST_CURVE,
    Motor,
    a100_rn_kndx_motor,
    curve_thrust,
    motor_mass,
    rectangular_thrust,
)
from .recovery import RecoveryConfig, RecoveryPoint, RecoveryResult, simulate_recovery
from .stability import StaticMargin, static_margin
from .trajectory import FlightConfig, FlightPoint, FlightResult, simulate_to_apogee

__version__ = "0.1.0-dev0"

__all__ = [
    "AtmosphereState",
    "CDRRun",
    "CPContribution",
    "CPResult",
    "ComponentMassProperty",
    "EngineeringResult",
    "FlightConfig",
    "FlightPoint",
    "FlightResult",
    "MassPoint",
    "MassProperties",
    "MissionSample",
    "Motor",
    "A100_RN_KNDX_OFFICIAL_AVERAGE_THRUST_N",
    "A100_RN_KNDX_THRUST_CURVE",
    "RecoveryConfig",
    "RecoveryPoint",
    "RecoveryResult",
    "StaticMargin",
    "a100_rn_kndx_motor",
    "analyze_vehicle",
    "axial_uniform_cg",
    "axisymmetric_nose_cp_from_profile",
    "axisymmetric_shell_cg_from_profile",
    "center_of_gravity",
    "combine_component_mass_properties",
    "combine_cp",
    "curve_thrust",
    "isa_troposphere",
    "motor_mass",
    "rectangular_thrust",
    "run_cdr_case",
    "simulate_recovery",
    "simulate_to_apogee",
    "static_margin",
    "tangent_ogive_cp",
    "tangent_ogive_shell_cg",
    "trapezoidal_fin_planform_cg_x",
    "trapezoidal_fin_set_cp",
]
