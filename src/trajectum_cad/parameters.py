from dataclasses import dataclass


@dataclass(frozen=True)
class Parameter:
    name: str
    value: float | None
    unit: str
    status: str


CDR_PARAMETERS = (
    Parameter("L_TOTAL", 860.0, "mm", "frozen"),
    Parameter("L_NOSE", 180.0, "mm", "frozen"),
    Parameter("L_BAY", 180.0, "mm", "frozen"),
    Parameter("L_BODY", 500.0, "mm", "frozen"),
    Parameter("D_EXT", 63.0, "mm", "frozen"),
    Parameter("WALL", 2.0, "mm", "provisional"),
    Parameter("FIN_COUNT", 4.0, "unitless", "frozen"),
    Parameter("FIN_ROOT", 80.0, "mm", "provisional"),
    Parameter("FIN_SPAN", 50.0, "mm", "provisional"),
    Parameter("FIN_TIP", None, "mm", "tbd"),
    Parameter("FIN_SWEEP", None, "mm", "tbd"),
    Parameter("FIN_X", None, "mm", "tbd"),
)
