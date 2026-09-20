from __future__ import annotations

from dataclasses import dataclass, field


def _require_text(value: str, field_name: str) -> None:
    if not value.strip():
        raise ValueError(f"{field_name} is required.")


@dataclass(frozen=True)
class Evidence:
    result: str
    model: str
    inputs: tuple[str, ...]
    source: str
    assumptions: tuple[str, ...] = ()
    validity: str = ""
    version: str = ""
    test: str = ""

    def __post_init__(self) -> None:
        for field_name in ("result", "model", "source", "validity", "version", "test"):
            _require_text(getattr(self, field_name), field_name)
        if not self.inputs or any(not item.strip() for item in self.inputs):
            raise ValueError("At least one exact input reference is required.")
        if not self.assumptions or any(not item.strip() for item in self.assumptions):
            raise ValueError("At least one explicit assumption is required.")


@dataclass(frozen=True)
class ReportSection:
    title: str
    body: str
    evidence: tuple[Evidence, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        _require_text(self.title, "section title")
        _require_text(self.body, "section body")


@dataclass(frozen=True)
class EngineeringReport:
    title: str
    phase: str
    sections: tuple[ReportSection, ...]

    def __post_init__(self) -> None:
        _require_text(self.title, "report title")
        _require_text(self.phase, "report phase")
        if not self.sections:
            raise ValueError("A report must contain at least one section.")
