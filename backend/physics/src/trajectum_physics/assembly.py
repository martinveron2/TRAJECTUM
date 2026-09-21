from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AxialPart:
    key: str
    name: str
    raw_length_m: float


@dataclass(frozen=True)
class AxialInterface:
    upstream_key: str
    downstream_key: str
    overlap_m: float | None


@dataclass(frozen=True)
class AxialStation:
    key: str
    name: str
    x_start_m: float | None
    x_end_m: float | None
    raw_length_m: float


@dataclass(frozen=True)
class AxialAssembly:
    stations: tuple[AxialStation, ...]
    total_length_m: float | None
    blockers: tuple[str, ...]

    @property
    def resolved(self) -> bool:
        return not self.blockers


def assemble_axially(
    parts: tuple[AxialPart, ...],
    interfaces: tuple[AxialInterface, ...],
) -> AxialAssembly:
    """Place serial airframe parts on x=0 at the nose tip.

    Each interface overlap is the axial engagement between adjacent parts.
    Missing overlaps fail closed: downstream stations and total length stay
    unresolved instead of silently summing raw part lengths.
    """
    if not parts:
        raise ValueError("At least one axial part is required.")
    if any(part.raw_length_m <= 0 for part in parts):
        raise ValueError("All axial part lengths must be positive.")

    interface_map = {
        (item.upstream_key, item.downstream_key): item
        for item in interfaces
    }
    stations: list[AxialStation] = []
    blockers: list[str] = []

    first = parts[0]
    start: float | None = 0.0
    end: float | None = first.raw_length_m
    stations.append(AxialStation(first.key, first.name, start, end, first.raw_length_m))

    for previous, current in zip(parts, parts[1:]):
        interface = interface_map.get((previous.key, current.key))
        blocker = f"assembly.interfaces.{previous.key}_to_{current.key}.overlap_mm"

        if interface is None or interface.overlap_m is None:
            blockers.append(blocker)
            start = None
            end = None
        elif interface.overlap_m < 0:
            raise ValueError("Axial overlap cannot be negative.")
        elif interface.overlap_m >= min(previous.raw_length_m, current.raw_length_m):
            raise ValueError("Axial overlap must be smaller than both adjacent parts.")
        elif stations[-1].x_end_m is None:
            start = None
            end = None
        else:
            start = stations[-1].x_end_m - interface.overlap_m
            end = start + current.raw_length_m

        stations.append(AxialStation(current.key, current.name, start, end, current.raw_length_m))

    total_length = stations[-1].x_end_m if not blockers else None
    return AxialAssembly(
        stations=tuple(stations),
        total_length_m=total_length,
        blockers=tuple(blockers),
    )
