from __future__ import annotations

from dataclasses import dataclass, field

from .errors import ErrorCode, TrajectumError


@dataclass(frozen=True)
class RocketGeometry:
    total_length_mm: float
    outer_diameter_mm: float
    nose_length_mm: float
    modular_bay_length_mm: float
    lower_body_length_mm: float
    wall_thickness_mm: float | None = None

    def validate(self) -> None:
        values = [
            self.total_length_mm,
            self.outer_diameter_mm,
            self.nose_length_mm,
            self.modular_bay_length_mm,
            self.lower_body_length_mm,
        ]
        if any(v <= 0 for v in values):
            raise TrajectumError(
                ErrorCode.INVALID_GEOMETRY,
                "All principal geometry dimensions must be positive.",
                "core.geometry",
            )
        section_sum = self.nose_length_mm + self.modular_bay_length_mm + self.lower_body_length_mm
        if abs(section_sum - self.total_length_mm) > 1e-6:
            raise TrajectumError(
                ErrorCode.INVALID_GEOMETRY,
                f"Axial sections sum to {section_sum:.6g} mm, not {self.total_length_mm:.6g} mm.",
                "core.geometry",
                context={"section_sum_mm": section_sum, "total_length_mm": self.total_length_mm},
            )


@dataclass(frozen=True)
class MassItem:
    name: str
    mass_g: float
    x_cg_mm: float

    def validate(self) -> None:
        if self.mass_g < 0:
            raise TrajectumError(
                ErrorCode.INVALID_MASS,
                f"Negative mass for component '{self.name}'.",
                "core.mass",
            )


@dataclass(frozen=True)
class FinGeometry:
    count: int
    root_chord_mm: float
    tip_chord_mm: float | None
    span_mm: float
    sweep_length_mm: float | None
    leading_edge_x_mm: float | None

    @property
    def is_complete_for_cp(self) -> bool:
        return (
            self.count >= 3
            and self.root_chord_mm > 0
            and self.tip_chord_mm is not None
            and self.tip_chord_mm > 0
            and self.span_mm > 0
            and self.sweep_length_mm is not None
            and self.leading_edge_x_mm is not None
        )


@dataclass(frozen=True)
class VehicleConfiguration:
    name: str
    geometry: RocketGeometry
    fins: FinGeometry
    masses: tuple[MassItem, ...] = field(default_factory=tuple)
    launch_angle_deg: float = 85.0

    def validate(self) -> None:
        self.geometry.validate()
        for item in self.masses:
            item.validate()
        if not 0 < self.launch_angle_deg <= 90:
            raise TrajectumError(
                ErrorCode.INVALID_CONFIGURATION,
                "Launch angle must be in (0, 90] degrees.",
                "core.configuration",
            )
