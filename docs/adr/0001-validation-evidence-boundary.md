# ADR 0001: Validation owns comparisons, not physics

- Status: accepted
- Date: 2026-09-20

## Decision

`backend/validation` receives candidate outputs and reference evidence through data contracts. It
computes errors and pass/fail decisions, but does not import `trajectum_core`, `trajectum_physics`
or `trajectum_cad` and does not reproduce their equations.

Every evidence-bearing comparison records:

`result → model → exact input SHA-256 → source → assumptions → validity → version → test`

Acceptance uses a combined absolute and relative tolerance. This makes a zero reference explicit
and prevents division-by-zero workarounds from silently changing the criterion.

## Consequences

- Physics changes remain isolated from the independent comparison layer.
- OpenRocket and RocketPy adapters can be added later without making either tool authoritative.
- A passed comparison is traceable to immutable inputs and a stated tolerance rationale.
- Missing inputs remain pending and cannot be converted into invented numerical evidence.
