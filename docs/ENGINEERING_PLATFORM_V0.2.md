# TRAJECTUM engineering platform v0.2

The platform is split into replaceable modules with one-way engineering contracts. The web UI never owns the authoritative physics equations.

## Runtime chain

`vehicle inputs -> API -> physics/cad modules -> typed results -> UI/reporting`

## Active modules

- `physics.analysis`: orchestrates mass properties, Barrowman CP, static margin and point-mass trajectory.
- `physics.mass`: weighted analytical CG.
- `physics.aerodynamics`: first-order Barrowman nose + trapezoidal-fin CP.
- `physics.trajectory`: 2D point-mass flight to apogee with atmosphere, drag, gravity and motor mass depletion.
- `cad.nose`: exact tangent-ogive station generator.
- `cad.airfoil`: NACA 4-digit section generator.
- `cad.imports`: format adapter registry for STEP, Fusion 360, Inventor and STL.

## CAD interoperability rule

STEP is the preferred neutral solid exchange. Native Fusion/Inventor files require dedicated connectors or export to STEP. STL is treated as mesh/preview data and is not the preferred source for engineering mass properties.

## Traceability rule

Every numerical result must come from explicit vehicle inputs and a named model. Unknown CDR-critical values remain blockers; the UI may preload legacy PDR values only when they are visibly marked as test/demo fixtures.

## Current fidelity limits

The trajectory solver uses a rectangular thrust placeholder preserving total impulse until a measured thrust-time curve is supplied. The Barrowman model remains a low-angle, slender, subsonic first-order model. CAD native parsing and bidirectional Fusion synchronization are adapter milestones, not yet claimed as complete.
