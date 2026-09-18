from __future__ import annotations

from dataclasses import dataclass
from itertools import pairwise
from math import pi, sqrt


@dataclass(frozen=True)
class CPContribution:
    name: str
    cn_alpha: float
    x_cp_m: float


@dataclass(frozen=True)
class CPResult:
    x_cp_m: float
    cn_alpha_total: float
    contributions: tuple[CPContribution, ...]


def tangent_ogive_cp(nose_length_m: float) -> CPContribution:
    """First-order Barrowman contribution for a tangent ogive nose.

    The CP location is measured from the nose tip.
    """
    if nose_length_m <= 0:
        raise ValueError("Nose length must be positive.")
    return CPContribution(name="nose", cn_alpha=2.0, x_cp_m=0.466 * nose_length_m)


def trapezoidal_fin_set_cp(
    *,
    count: int,
    body_diameter_m: float,
    span_m: float,
    root_chord_m: float,
    tip_chord_m: float,
    sweep_length_m: float,
    leading_edge_x_m: float,
) -> CPContribution:
    """Classical Barrowman-style contribution for a trapezoidal fin set.

    sweep_length_m is the axial offset from the root leading edge to the
    tip leading edge. leading_edge_x_m is measured from the nose tip.
    """
    if count < 3:
        raise ValueError("At least three fins are required.")
    if min(body_diameter_m, span_m, root_chord_m, tip_chord_m) <= 0:
        raise ValueError("Fin dimensions and body diameter must be positive.")
    if sweep_length_m < 0 or leading_edge_x_m < 0:
        raise ValueError("Sweep and axial position must be non-negative.")

    mid_chord_offset = sweep_length_m + 0.5 * (tip_chord_m - root_chord_m)
    mid_chord_line = sqrt(span_m**2 + mid_chord_offset**2)

    raw_cn = (
        4.0
        * count
        * (span_m / body_diameter_m) ** 2
        / (
            1.0
            + sqrt(
                1.0
                + (2.0 * mid_chord_line / (root_chord_m + tip_chord_m)) ** 2
            )
        )
    )

    body_radius = body_diameter_m / 2.0
    body_interference = 1.0 + body_radius / (body_radius + span_m)
    cn_alpha = raw_cn * body_interference

    chord_sum = root_chord_m + tip_chord_m
    x_relative = (
        sweep_length_m
        * (root_chord_m + 2.0 * tip_chord_m)
        / (3.0 * chord_sum)
        + (
            root_chord_m
            + tip_chord_m
            - root_chord_m * tip_chord_m / chord_sum
        )
        / 6.0
    )
    return CPContribution(
        name="fins",
        cn_alpha=cn_alpha,
        x_cp_m=leading_edge_x_m + x_relative,
    )


def combine_cp(*parts: CPContribution) -> CPResult:
    if not parts:
        raise ValueError("At least one CP contribution is required.")
    total_cn = sum(part.cn_alpha for part in parts)
    if total_cn <= 0:
        raise ValueError("Total normal-force slope must be positive.")
    x_cp = sum(part.cn_alpha * part.x_cp_m for part in parts) / total_cn
    return CPResult(
        x_cp_m=x_cp,
        cn_alpha_total=total_cn,
        contributions=tuple(parts),
    )


def axisymmetric_nose_cp_from_profile(
    profile: tuple[tuple[float, float], ...],
    *,
    base_radius_m: float,
) -> CPContribution:
    """Barrowman slender-body nose CP from an axisymmetric radius profile.

    Profile stations are (x, radius) in metres with x=0 at the tip.
    For a body of revolution, x_CP = L - V/A_base and CN_alpha = 2.
    """
    if len(profile) < 3 or base_radius_m <= 0:
        raise ValueError("A valid nose profile and positive base radius are required.")
    ordered = tuple(sorted(profile))
    if ordered[0][0] < -1e-12:
        raise ValueError("Nose profile x coordinates must be non-negative.")
    length = ordered[-1][0]
    if length <= 0:
        raise ValueError("Nose profile length must be positive.")
    volume = 0.0
    for (x0, r0), (x1, r1) in pairwise(ordered):
        dx = x1 - x0
        if dx <= 0 or min(r0, r1) < 0:
            raise ValueError("Nose profile stations must be ordered with non-negative radii.")
        volume += 0.5 * (pi * r0**2 + pi * r1**2) * dx
    base_area = pi * base_radius_m**2
    return CPContribution(name="nose", cn_alpha=2.0, x_cp_m=length - volume / base_area)
