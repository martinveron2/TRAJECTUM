from __future__ import annotations

from dataclasses import dataclass, field


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


@dataclass(frozen=True)
class ReportSection:
    title: str
    body: str
    evidence: tuple[Evidence, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class EngineeringReport:
    title: str
    phase: str
    sections: tuple[ReportSection, ...]
