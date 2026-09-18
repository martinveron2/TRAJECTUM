from __future__ import annotations

from math import atan, cos, pi, sin, sqrt


def _parse_naca4(designation: str) -> tuple[float, float, float]:
    text = designation.upper().replace("NACA", "").replace(" ", "")
    if len(text) != 4 or not text.isdigit():
        raise ValueError("Expected a four-digit NACA designation, e.g. 'NACA 0012'.")
    m = int(text[0]) / 100.0
    p = int(text[1]) / 10.0
    t = int(text[2:]) / 100.0
    if m > 0 and p == 0:
        raise ValueError("Cambered NACA 4-digit profiles require a non-zero camber location digit.")
    if t <= 0:
        raise ValueError("NACA thickness must be positive.")
    return m, p, t


def naca4_coordinates(
    designation: str,
    *,
    points_per_side: int = 50,
    closed_trailing_edge: bool = True,
) -> tuple[tuple[float, float], ...]:
    """Generate normalized (x/c, y/c) contour coordinates for a NACA 4-digit airfoil.

    The returned contour starts at the trailing edge on the upper surface,
    walks to the leading edge, and returns along the lower surface. Scaling to
    root/tip chord is intentionally left to the CAD layer.
    """
    if points_per_side < 8:
        raise ValueError("At least 8 points per side are required.")
    m, p, t = _parse_naca4(designation)
    te = -0.1036 if closed_trailing_edge else -0.1015

    xs = [0.5 * (1.0 - cos(pi * i / (points_per_side - 1))) for i in range(points_per_side)]
    upper: list[tuple[float, float]] = []
    lower: list[tuple[float, float]] = []

    for x in xs:
        yt = 5.0 * t * (
            0.2969 * sqrt(max(x, 0.0))
            - 0.1260 * x
            - 0.3516 * x**2
            + 0.2843 * x**3
            + te * x**4
        )

        if m == 0.0:
            yc = 0.0
            dyc_dx = 0.0
        elif x < p:
            yc = m / p**2 * (2.0 * p * x - x**2)
            dyc_dx = 2.0 * m / p**2 * (p - x)
        else:
            yc = m / (1.0 - p) ** 2 * ((1.0 - 2.0 * p) + 2.0 * p * x - x**2)
            dyc_dx = 2.0 * m / (1.0 - p) ** 2 * (p - x)

        theta = atan(dyc_dx)
        upper.append((x - yt * sin(theta), yc + yt * cos(theta)))
        lower.append((x + yt * sin(theta), yc - yt * cos(theta)))

    return tuple(reversed(upper)) + tuple(lower[1:])
