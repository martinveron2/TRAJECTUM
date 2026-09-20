# UTN FRH Grupo 07 — CDR current-design baseline

This directory is the machine-readable engineering baseline for the current rocket design.

## Source priority

1. Current Fusion CAD + dated PDF drawings.
2. Measured component masses supplied by the team.
3. Explicitly documented engineering assumptions.
4. Legacy demo values only for software/test fixtures.

The former 860 / 180 / 180 / 500 mm vehicle and 80 / 40 / 50 / 40 mm fin planform are **not** current-design truth. They are retained only as a functional simulation fixture.

## Current verified ingest — 2026-09-19/20

- External diameter: 63 mm.
- Tangent-ogive nose: 180 mm.
- C1 raw length: 215 mm.
- C2 raw length: 215 mm; 200 mm dimensioned body.
- Tail/fin-can raw length: 225 mm; NACA 0012; 168 mm overall fin span.
- Motor mount: 190 mm, Ø54/Ø33.
- Measured printed-structure masses: 126 + 190 + 146 + 260 + 148 = **870 g**.

The final assembled length, fin-planform mapping, component axial CG stations and aerodynamic Cd intentionally remain unresolved rather than guessed. Those items block final CG/CP/trajectory results.
