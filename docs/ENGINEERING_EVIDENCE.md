# Engineering Evidence

This document summarizes the current evidence behind TRAJECTUM's principal engineering capabilities.

The purpose is not to claim that every model is experimentally validated. It is to make the evidence level, source and remaining limitations visible.

## Evidence matrix

| Capability | Method / model | Current evidence | Status | Main limitation |
| --- | --- | --- | --- | --- |
| Vehicle geometry | Canonical vehicle definition + CAD/drawing inputs | Current reference case tied to Fusion-derived dimensions and assembly documentation | **Verified / derived by field** | Some dimensions may remain design-revision dependent |
| Mass properties | Component mass moments | Measured component masses with explicit axial stations; geometry-derived or provisional xCG where applicable | **Partially verified** | Final CG should be confirmed by balance test or validated CAD mass properties |
| Center of gravity | Weighted mass-moment calculation | Deterministic calculation from component masses and xCG values | **Analytically verified model** | Output quality depends directly on component xCG evidence |
| Center of pressure | Barrowman-style nose + trapezoidal fin contributions | Geometry-traceable implementation and reproducible reference case | **Model verified / first-order** | Not a CFD or full nonlinear aerodynamic solution |
| Static margin | (CP - CG) normalized by body diameter | Derived directly from current CG and CP outputs | **Derived** | Inherits CG and CP model/input limitations |
| Atmosphere | Standard-atmosphere implementation | Standard equations with automated regression tests | **Verified implementation** | Does not represent local measured weather unless explicitly added |
| Propulsion | Time-varying thrust curve + propellant depletion | Source-backed motor inputs and integrated thrust history | **Source-backed / model verified** | Accuracy depends on actual motor test data and manufacturing variability |
| Trajectory | 2D point-mass equations integrated with RK4 | Automated tests plus independent RocketPy 1.13.0 cross-check under matched assumptions | **Cross-tool verified** | Current workflow is not full 6-DOF flight dynamics |
| Drag | Effective Cd input / documented estimation path | Explicit coefficient and documented assumptions | **Provisional unless test-backed** | Effective Cd does not capture every Reynolds/Mach/angle-of-attack effect |
| Recovery | Simplified drag-based descent model | Explicit parachute Cd, area and deployment parameters | **Preliminary** | Requires physical deployment and descent-test validation |
| Flight visualization | Replay of computed mission timeline | Uses analysis output rather than an independent physics path | **Presentation verified** | Visualization is not separate validation evidence |
| API / calculation pipeline | FastAPI + typed engineering modules | Automated tests and CI checks | **Software verified** | Test passing does not by itself validate physical assumptions |
| CAD interoperability | Geometry/reference ingestion and normalized engineering data | Current CAD-reference workflow and parameter contracts | **In progress** | Native CAD mass-property and geometry ingestion is not yet fully generalized |

## Evidence levels

**Verified** means supported by an identified source, test, drawing, measurement, standard equation or deterministic software check appropriate to the item.

**Derived** means calculated from other identified inputs.

**Cross-tool verified** means the implementation has been compared with an independent numerical tool under matched assumptions.

**Provisional** means usable for iteration but still awaiting stronger evidence.

**Experimental validation** is reserved for agreement with physical test or flight data. TRAJECTUM does not use that label unless such evidence exists.

## Current independent cross-check

The present CDR reference trajectory has been compared with RocketPy 1.13.0 using matched mass, thrust, drag, atmosphere and launch assumptions.

The comparison produced close agreement in apogee, time to apogee, maximum speed, Mach number, dynamic pressure and burnout state.

See [Validation](VALIDATION.md) for the comparison table and scope.

## Release gate philosophy

A model should move toward a stronger evidence state only when the corresponding evidence improves.

For example:

- a provisional component xCG can become verified after CAD mass-property confirmation or physical balance measurement;
- an estimated Cd can become test-backed after aerodynamic or flight-data identification;
- a cross-tool trajectory comparison can become experimentally validated only after comparison with physical flight data.

This prevents software maturity from being confused with physical-model maturity.
