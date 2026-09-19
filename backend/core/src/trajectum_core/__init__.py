from .airfoil import AirfoilProfile
from .dependency import DEFAULT_DEPENDENCIES, affected_modules
from .errors import ErrorCode, TrajectumError
from .models import FinGeometry, MassItem, RocketGeometry, VehicleConfiguration
from .requirements import ProjectRequirement, UTN_FRH_2026_REQUIREMENTS

__version__ = "0.1.0-dev0"

__all__ = [
    "DEFAULT_DEPENDENCIES",
    "AirfoilProfile",
    "ErrorCode",
    "FinGeometry",
    "MassItem",
    "RocketGeometry",
    "ProjectRequirement",
    "UTN_FRH_2026_REQUIREMENTS",
    "TrajectumError",
    "VehicleConfiguration",
    "affected_modules",
]
