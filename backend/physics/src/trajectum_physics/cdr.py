from __future__ import annotations

import json
from dataclasses import dataclass
from math import pi
from pathlib import Path
from typing import Any

from .aerodynamics import combine_cp, tangent_ogive_cp, trapezoidal_fin_set_cp
from .mass import MassPoint, MassProperties, center_of_gravity
from .propulsion import Motor
from .stability import StaticMargin, static_margin
from .trajectory import FlightConfig, FlightResult, simulate_to_apogee


@dataclass(frozen=True)
class CDRRun:
    vehicle_id: str
    cg: MassProperties | None
    cp_x_m: float | None
    stability: StaticMargin | None
    trajectory: FlightResult | None
    blockers: tuple[str, ...]

    @property
    def ready_for_numeric_cdr(self) -> bool:
        return not self.blockers


def _value(field: Any) -> Any:
    if isinstance(field, dict) and "value" in field:
        return field["value"]
    return field


def _require_number(data: dict[str, Any], path: str, blockers: list[str]) -> float | None:
    node: Any = data
    for part in path.split("."):
        if not isinstance(node, dict) or part not in node:
            blockers.append(path)
            return None
        node = node[part]
    value = _value(node)
    if value is None:
        blockers.append(path)
        return None
    return float(value)


def run_cdr_case(path: str | Path) -> CDRRun:
    """Run every CDR calculation supported by the available case inputs.

    Missing engineering inputs are returned as explicit blockers rather than
    replaced with guessed values.
    """
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    blockers: list[str] = []

    diameter_mm = _require_number(payload, "geometry.outer_diameter_mm", blockers)
    nose_length_mm = _require_number(payload, "geometry.nose_length_mm", blockers)
    launch_angle_deg = _require_number(payload, "launch_angle_deg", blockers)

    # Mass properties
    cg: MassProperties | None = None
    mass_items = payload.get("masses", {}).get("items")
    if mass_items:
        points = tuple(
            MassPoint(
                name=str(item["name"]),
                mass_kg=float(item["mass_g"]) / 1000.0,
                x_m=float(item["x_cg_mm"]) / 1000.0,
            )
            for item in mass_items
        )
        cg = center_of_gravity(points)
    else:
        blockers.append("masses.items")

    # Aerodynamic CP
    cp_x_m: float | None = None
    fin_paths = (
        "fins.count",
        "fins.root_chord_mm",
        "fins.tip_chord_mm",
        "fins.span_mm",
        "fins.sweep_length_mm",
        "fins.leading_edge_x_mm",
    )
    fin_values = {p: _require_number(payload, p, blockers) for p in fin_paths}

    if diameter_mm is not None and nose_length_mm is not None and all(
        value is not None for value in fin_values.values()
    ):
        nose = tangent_ogive_cp(nose_length_mm / 1000.0)
        fins = trapezoidal_fin_set_cp(
            count=int(fin_values["fins.count"]),
            body_diameter_m=diameter_mm / 1000.0,
            root_chord_m=fin_values["fins.root_chord_mm"] / 1000.0,
            tip_chord_m=fin_values["fins.tip_chord_mm"] / 1000.0,
            span_m=fin_values["fins.span_mm"] / 1000.0,
            sweep_length_m=fin_values["fins.sweep_length_mm"] / 1000.0,
            leading_edge_x_m=fin_values["fins.leading_edge_x_mm"] / 1000.0,
        )
        cp_x_m = combine_cp(nose, fins).x_cp_m

    stability: StaticMargin | None = None
    if cg is not None and cp_x_m is not None and diameter_mm is not None:
        stability = static_margin(
            cg_x_m=cg.cg_x_m,
            cp_x_m=cp_x_m,
            body_diameter_m=diameter_mm / 1000.0,
        )

    # Trajectory
    trajectory: FlightResult | None = None
    cd = _require_number(payload, "aerodynamics.cd", blockers)
    burn_time = _require_number(payload, "motor.burn_time_s", blockers)
    total_impulse = _require_number(payload, "motor.total_impulse_n_s", blockers)
    propellant_mass_g = _require_number(payload, "motor.propellant_mass_g", blockers)
    dry_mass_g = _require_number(payload, "motor.dry_mass_g", blockers)

    if (
        cg is not None
        and diameter_mm is not None
        and launch_angle_deg is not None
        and cd is not None
        and burn_time is not None
        and total_impulse is not None
        and propellant_mass_g is not None
        and dry_mass_g is not None
    ):
        motor_mass_kg = (propellant_mass_g + dry_mass_g) / 1000.0
        non_motor_mass_kg = cg.total_mass_kg - motor_mass_kg
        if non_motor_mass_kg <= 0:
            raise ValueError("Mass table must include a positive non-motor mass.")
        motor = Motor(
            burn_time_s=burn_time,
            total_impulse_n_s=total_impulse,
            propellant_mass_kg=propellant_mass_g / 1000.0,
            dry_mass_kg=dry_mass_g / 1000.0,
        )
        reference_area = pi * (diameter_mm / 1000.0) ** 2 / 4.0
        trajectory = simulate_to_apogee(
            FlightConfig(
                launch_angle_deg=launch_angle_deg,
                reference_area_m2=reference_area,
                cd=cd,
                non_motor_mass_kg=non_motor_mass_kg,
                motor=motor,
            )
        )

    # Keep blocker list deterministic and free of duplicates.
    return CDRRun(
        vehicle_id=str(payload.get("id", "unknown")),
        cg=cg,
        cp_x_m=cp_x_m,
        stability=stability,
        trajectory=trajectory,
        blockers=tuple(dict.fromkeys(blockers)),
    )
