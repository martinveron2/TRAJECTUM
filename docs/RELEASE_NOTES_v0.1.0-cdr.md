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

## Current CDR reference case

| Parameter | Value |
| --- | ---: |
| Apogee | **720.45 m** |
| Time to apogee | **11.66 s** |
| Maximum velocity | **138.08 m/s** |
| Maximum Mach | **0.406** |
| Maximum dynamic pressure | **11.64 kPa** |
| CG from nose | **523.49 mm** |
| CG from support point | **301.56 mm** |
| CP from nose | **602.68 mm** |
| CP from support point | **222.37 mm** |
| Static margin | **1.26 calibers** |
| Solver | **RK4 2D, Δt = 0.002 s** |
| Vehicle Cd | **0.345 (provisional)** |

The independent RocketPy cross-check gives **728.60 m** apogee under matched first-order assumptions. The simplified analytical estimate gives **816.0 m** and is retained as a lower-fidelity comparison method.

CG and CP remain reference values for the current CDR configuration until closure through CAD mass properties and/or physical measurement.

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
