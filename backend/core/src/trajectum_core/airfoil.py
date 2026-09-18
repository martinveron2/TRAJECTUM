from __future__ import annotations

import re
from dataclasses import dataclass

_NACA4 = re.compile(r"^(?:NACA\s*)?(\d{4})$", re.IGNORECASE)


@dataclass(frozen=True)
class AirfoilProfile:
    """Cross-section definition for a fin.

    `kind="naca4"` stores a standard four-digit NACA designation.
    `kind="custom"` stores normalized upper/lower contour coordinates as
    (x/c, y/c) pairs. The planform dimensions (root/tip chord, span, sweep)
    remain separate in FinGeometry.
    """

    kind: str
    designation: str | None = None
    coordinates: tuple[tuple[float, float], ...] = ()

    @classmethod
    def naca4(cls, designation: str) -> AirfoilProfile:
        match = _NACA4.fullmatch(designation.strip())
        if match is None:
            raise ValueError("NACA 4-digit profile must look like 'NACA 0012' or '0012'.")
        digits = match.group(1)
        return cls(kind="naca4", designation=f"NACA {digits}")

    @classmethod
    def custom(
        cls,
        coordinates: tuple[tuple[float, float], ...] | list[tuple[float, float]],
        *,
        designation: str | None = None,
    ) -> AirfoilProfile:
        pts = tuple((float(x), float(y)) for x, y in coordinates)
        if len(pts) < 3:
            raise ValueError("A custom airfoil requires at least three contour points.")
        if any(not 0.0 <= x <= 1.0 for x, _ in pts):
            raise ValueError("Custom airfoil x coordinates must be normalized to x/c in [0, 1].")
        return cls(kind="custom", designation=designation, coordinates=pts)

    @property
    def naca4_parameters(self) -> tuple[float, float, float] | None:
        """Return (max camber, camber location, thickness) as chord fractions."""
        if self.kind != "naca4" or self.designation is None:
            return None
        digits = self.designation.split()[-1]
        m = int(digits[0]) / 100.0
        p = int(digits[1]) / 10.0
        t = int(digits[2:]) / 100.0
        return m, p, t
