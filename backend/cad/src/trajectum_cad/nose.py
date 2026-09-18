from __future__ import annotations

from math import sqrt


def tangent_ogive_profile(
    *,
    length_mm: float,
    base_radius_mm: float,
    stations: int = 81,
) -> tuple[tuple[float, float], ...]:
    """Return (x, radius) stations for an exact tangent ogive.

    x=0 is the tip and x=length is the body junction.
    """
    if length_mm <= 0 or base_radius_mm <= 0:
        raise ValueError("Ogive length and base radius must be positive.")
    if stations < 3:
        raise ValueError("At least three stations are required.")
    rho = (base_radius_mm**2 + length_mm**2) / (2.0 * base_radius_mm)
    points: list[tuple[float, float]] = []
    for index in range(stations):
        x = length_mm * index / (stations - 1)
        inside = max(rho**2 - (length_mm - x) ** 2, 0.0)
        radius = sqrt(inside) + base_radius_mm - rho
        points.append((x, radius))
    return tuple(points)
