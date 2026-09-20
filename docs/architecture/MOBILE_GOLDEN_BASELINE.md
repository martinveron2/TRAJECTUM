# TRAJECTUM Mobile Golden Baseline

Status: **frozen during platform isolation refactor**

Canonical baseline commit: fe1a201c17322a61285471caae85f9125b10defe

The mobile UI at this commit is the behavioral and visual golden baseline for the platform-isolation migration.

## Invariants

During the structural refactor, mobile must preserve:

- the six-phase sequence: MDR → PDR → CDR/analysis → FRR → LRR → PFR;
- the persistent bottom command bar;
- CDR navigation to the stable analysis route;
- the numeric wheel picker and its portal behavior;
- CAD modal/portal behavior and z-index;
- existing labels, values, geometry, spacing, typography, colors, transitions and touch behavior;
- existing engineering results and API calls.

No visual cleanup, UX redesign, physics consolidation, CSS deduplication or numerical changes belong in this migration.

## Platform boundary

Mobile code lives under frontend/web/src/app/mobile/**.
Desktop code lives under frontend/web/src/app/desktop/**.
Shared domain contracts live under frontend/web/src/shared/**.

A desktop-only change must not modify mobile files. A mobile-only change must not modify desktop files.
Shared code must not import either platform UI.
