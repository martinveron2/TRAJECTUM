from __future__ import annotations

from collections import deque

DEFAULT_DEPENDENCIES: dict[str, set[str]] = {
    "geometry": {"mass", "aerodynamics", "cad"},
    "mass": {"cg", "trajectory"},
    "cg": {"stability"},
    "aerodynamics": {"cp", "trajectory"},
    "cp": {"stability"},
    "atmosphere": {"trajectory"},
    "propulsion": {"trajectory"},
    "trajectory": {"reporting"},
    "stability": {"reporting"},
    "cad": {"reporting"},
}


def affected_modules(changed: set[str], graph: dict[str, set[str]] | None = None) -> list[str]:
    graph = graph or DEFAULT_DEPENDENCIES
    seen = set(changed)
    queue = deque(changed)
    while queue:
        node = queue.popleft()
        for nxt in graph.get(node, set()):
            if nxt not in seen:
                seen.add(nxt)
                queue.append(nxt)
    return sorted(seen)
