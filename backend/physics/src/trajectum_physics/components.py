from __future__ import annotations

from dataclasses import dataclass
from math import pi, sqrt

from .mass import MassPoint, MassProperties, center_of_gravity


@dataclass(frozen=True)
class ComponentMassProperty:
    name: str
    mass_kg: float
    x_cg_m: float
    source: str


def axial_uniform_cg(*, x_start_m: float, x_end_m: float) -> float:
    if x_end_m <= x_start_m:
        raise ValueError("Axial component end must be after start.")
    return 0.5 * (x_start_m + x_end_m)


def tangent_ogive_shell_cg(*, length_m: float, base_radius_m: float, stations: int = 2001) -> float:
    """Surface-area centroid of a thin tangent-ogive shell, x=0 at the tip."""
    if length_m <= 0 or base_radius_m <= 0:
        raise ValueError("Ogive dimensions must be positive.")
    if stations < 5 or stations % 2 == 0:
        raise ValueError("stations must be odd and >= 5.")
    rho = (base_radius_m**2 + length_m**2) / (2.0 * base_radius_m)
    dx = length_m / (stations - 1)
    area_sum = 0.0
    moment_sum = 0.0
    prev = None
    for i in range(stations):
        x = i * dx
        inside = max(rho**2 - (length_m - x) ** 2, 0.0)
        root = sqrt(inside)
        y = root + base_radius_m - rho
        dydx = (length_m - x) / root if root > 1e-15 else 0.0
        density = 2.0 * pi * y * sqrt(1.0 + dydx**2)
        current = (x, density)
        if prev is not None:
            x0, d0 = prev
            area = 0.5 * (d0 + density) * dx
            area_sum += area
            moment_sum += 0.5 * (x0 * d0 + x * density) * dx
        prev = current
    if area_sum <= 0:
        raise ValueError("Invalid ogive surface area.")
    return moment_sum / area_sum


def trapezoidal_fin_planform_cg_x(*, leading_edge_x_m: float, root_chord_m: float, tip_chord_m: float, span_m: float, sweep_m: float) -> float:
    """Planform centroid x of a trapezoidal fin using polygon centroid geometry."""
    if min(root_chord_m, tip_chord_m, span_m) <= 0 or leading_edge_x_m < 0 or sweep_m < 0:
        raise ValueError("Invalid fin geometry.")
    pts = [
        (leading_edge_x_m, 0.0),
        (leading_edge_x_m + root_chord_m, 0.0),
        (leading_edge_x_m + sweep_m + tip_chord_m, span_m),
        (leading_edge_x_m + sweep_m, span_m),
    ]
    twice_area = 0.0
    cx_num = 0.0
    for i, (x0, y0) in enumerate(pts):
        x1, y1 = pts[(i + 1) % len(pts)]
        cross = x0 * y1 - x1 * y0
        twice_area += cross
        cx_num += (x0 + x1) * cross
    if abs(twice_area) < 1e-15:
        raise ValueError("Degenerate fin planform.")
    return cx_num / (3.0 * twice_area)


def combine_component_mass_properties(items: tuple[ComponentMassProperty, ...]) -> MassProperties:
    return center_of_gravity(tuple(MassPoint(item.name, item.mass_kg, item.x_cg_m) for item in items))
