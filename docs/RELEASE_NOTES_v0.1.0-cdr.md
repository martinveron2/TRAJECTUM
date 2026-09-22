# TRAJECTUM v0.1.0-cdr — Release Notes

**Release date:** 2026-09-21

`v0.1.0-cdr` establishes the first productized CDR baseline of TRAJECTUM: a modular aerospace engineering and flight-simulation platform with a working web interface, traceable engineering inputs, analysis services and reproducible validation workflows.

## Included in this milestone

- Vehicle geometry and CAD-reference workflow.
- Component mass properties and CG calculation.
- Barrowman-style CP and static-margin analysis.
- RK4 trajectory simulation with atmospheric, drag, variable-mass and thrust-curve inputs.
- Propulsion and recovery configuration.
- Interactive PDR/CDR workflow.
- Mission-control / flight visualization.
- Engineering status tracking for verified, derived, provisional and unresolved inputs.
- Automated CI for Python modules and the web application.
- User documentation and independent cross-tool validation notes.

## Validation status

The trajectory implementation has been independently cross-checked against RocketPy 1.13.0 under matched first-order assumptions. The current comparison is verification evidence, not experimental flight validation.

## Known limits

- Current trajectory workflow is not a full 6-DOF simulation.
- Aerodynamic Cd may remain provisional depending on the active vehicle configuration.
- Recovery is based on a simplified descent model.
- Final design-quality CG requires confirmed component stations through CAD mass properties or physical measurement.
- Additional experimental validation is still required for safety-critical or operational use.

## Live application

https://trajectum-vercel.vercel.app

## Documentation

- [User Guide](USER_GUIDE.md)
- [Validation](VALIDATION.md)
- [Engineering Evidence](ENGINEERING_EVIDENCE.md)
- [Licensing](../LICENSING.md)
