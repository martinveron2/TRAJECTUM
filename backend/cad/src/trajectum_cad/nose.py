from __future__ import annotations

from math import acos, pi, sin, sqrt


def _validate(length_mm: float, base_radius_mm: float, stations: int) -> None:
    if length_mm <= 0 or base_radius_mm <= 0:
        raise ValueError("Nose length and base radius must be positive.")
    if stations < 3:
        raise ValueError("At least three stations are required.")


def tangent_ogive_profile(*, length_mm: float, base_radius_mm: float, stations: int = 81) -> tuple[tuple[float, float], ...]:
    _validate(length_mm, base_radius_mm, stations)
    rho = (base_radius_mm**2 + length_mm**2) / (2.0 * base_radius_mm)
    points = []
    for index in range(stations):
        x = length_mm * index / (stations - 1)
        inside = max(rho**2 - (length_mm - x) ** 2, 0.0)
        radius = sqrt(inside) + base_radius_mm - rho
        points.append((x, radius))
    return tuple(points)


def von_karman_profile(*, length_mm: float, base_radius_mm: float, stations: int = 81) -> tuple[tuple[float, float], ...]:
    """Haack-series von Kármán nose profile (C=0)."""
    _validate(length_mm, base_radius_mm, stations)
    points = []
    for index in range(stations):
        x = length_mm * index / (stations - 1)
        theta = acos(1.0 - 2.0 * x / length_mm)
        term = theta - 0.5 * sin(2.0 * theta)
        radius = base_radius_mm / sqrt(pi) * sqrt(max(term, 0.0))
        points.append((x, radius))
    return tuple(points)


def power_series_profile(
    *,
    length_mm: float,
    base_radius_mm: float,
    exponent: float = 0.75,
    stations: int = 81,
) -> tuple[tuple[float, float], ...]:
    """Simple power-series nose y = R (x/L)^n. n<1 sharpens the tip."""
    _validate(length_mm, base_radius_mm, stations)
    if exponent <= 0:
        raise ValueError("Power-series exponent must be positive.")
    return tuple(
        (
            length_mm * index / (stations - 1),
            base_radius_mm * (index / (stations - 1)) ** exponent,
        )
        for index in range(stations)
    )


def nose_profile(
    profile: str,
    *,
    length_mm: float,
    base_radius_mm: float,
    stations: int = 81,
    power_exponent: float = 0.75,
) -> tuple[tuple[float, float], ...]:
    key = profile.strip().lower().replace(" ", "_")
    if key in {"tangent_ogive", "ogive"}:
        return tangent_ogive_profile(length_mm=length_mm, base_radius_mm=base_radius_mm, stations=stations)
    if key in {"von_karman", "vonkarman", "haack"}:
        return von_karman_profile(length_mm=length_mm, base_radius_mm=base_radius_mm, stations=stations)
    if key in {"power_series", "power"}:
        return power_series_profile(
            length_mm=length_mm,
            base_radius_mm=base_radius_mm,
            exponent=power_exponent,
            stations=stations,
        )
    raise ValueError(f"Unsupported nose profile: {profile}")
