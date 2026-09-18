from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class CadFormatCapability:
    name: str
    extensions: tuple[str, ...]
    representation: str
    native_parse: bool
    recommended_path: str


CAD_FORMATS = (
    CadFormatCapability("DXF", (".dxf",), "2D sketch/profile", True, "browser preview + Fusion sketch import"),
    CadFormatCapability("STEP", (".step", ".stp"), "B-rep solid/surface", False, "primary neutral exchange"),
    CadFormatCapability("Fusion 360", (".f3d",), "native parametric", False, "Fusion add-in or export STEP"),
    CadFormatCapability("Inventor", (".ipt", ".iam"), "native parametric", False, "Inventor connector or export STEP"),
    CadFormatCapability("STL", (".stl",), "triangle mesh", False, "preview/mesh only; not preferred for engineering properties"),
)


def classify_cad_filename(filename: str) -> CadFormatCapability | None:
    suffix = Path(filename).suffix.lower()
    return next((item for item in CAD_FORMATS if suffix in item.extensions), None)
