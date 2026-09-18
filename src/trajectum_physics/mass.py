from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class MassPoint:
    name: str
    mass_kg: float
    x_m: float


@dataclass(frozen=True)
class MassProperties:
    total_mass_kg: float
    cg_x_m: float


def center_of_gravity(items: list[MassPoint] | tuple[MassPoint, ...]) -> MassProperties:
    if not items:
        raise ValueError("At least one mass item is required.")
    if any(item.mass_kg < 0 for item in items):
        raise ValueError("Masses must be non-negative.")
    total = sum(item.mass_kg for item in items)
    if total <= 0:
        raise ValueError("Total mass must be positive.")
    moment = sum(item.mass_kg * item.x_m for item in items)
    return MassProperties(total_mass_kg=total, cg_x_m=moment / total)
