# CDR numeric readiness

TRAJECTUM fails closed when a CDR-critical input is unknown. The canonical UTN-FRH-G07 case is intentionally not reported as numerically complete while the current-design mass table, final fin geometry, or drag coefficient remain unresolved.

Run:

    trajectum-cdr data/reference-cases/utn-frh-g07/vehicle.cdr.json

Known current blockers are expected to be:

- `masses.items`
- `fins.tip_chord_mm`
- `fins.sweep_length_mm`
- `fins.leading_edge_x_mm`
- `aerodynamics.cd`

The motor specification is represented in the canonical reference case from the TP input set: A-100 RN (29%H), KNDX, 0.5 s burn, 207 N·s total impulse, 441 N average thrust, 600 N maximum thrust, 140 g propellant and 350 g dry/structural mass.

No legacy PDR mass or fin value is promoted to a frozen CDR input merely to obtain a number.
