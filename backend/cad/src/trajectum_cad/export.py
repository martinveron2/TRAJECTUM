from __future__ import annotations

import csv
import json
from pathlib import Path

from .parameters import CDR_PARAMETERS, Parameter


def parameter_dict(parameters: tuple[Parameter, ...] = CDR_PARAMETERS) -> dict[str, dict[str, object]]:
    return {
        p.name: {"value": p.value, "unit": p.unit, "status": p.status}
        for p in parameters
    }


def export_parameter_json(path: str | Path, parameters: tuple[Parameter, ...] = CDR_PARAMETERS) -> Path:
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(parameter_dict(parameters), indent=2) + "\n", encoding="utf-8")
    return out


def export_fusion_csv(path: str | Path, parameters: tuple[Parameter, ...] = CDR_PARAMETERS) -> Path:
    """Export a reviewable Fusion-oriented parameter table.

    TBD values are intentionally emitted with an empty expression instead of
    fabricated geometry.
    """
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["name", "expression", "unit", "status"])
        for p in parameters:
            expression = "" if p.value is None else p.value
            writer.writerow([p.name, expression, p.unit, p.status])
    return out


def unresolved_parameters(parameters: tuple[Parameter, ...] = CDR_PARAMETERS) -> tuple[str, ...]:
    return tuple(p.name for p in parameters if p.value is None or p.status == "tbd")
