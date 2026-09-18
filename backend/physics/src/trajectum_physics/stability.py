from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class StaticMargin:
    cg_x_m: float
    cp_x_m: float
    body_diameter_m: float
    margin_m: float
    calibers: float


def static_margin(*, cg_x_m: float, cp_x_m: float, body_diameter_m: float) -> StaticMargin:
    """Return static margin using +X from nose to tail.

    Positive margin means CP is aft of CG.
    """
    if body_diameter_m <= 0:
        raise ValueError("Body diameter must be positive.")
    margin = cp_x_m - cg_x_m
    return StaticMargin(
        cg_x_m=cg_x_m,
        cp_x_m=cp_x_m,
        body_diameter_m=body_diameter_m,
        margin_m=margin,
        calibers=margin / body_diameter_m,
    )
