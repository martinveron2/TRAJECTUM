# Changelog

All notable changes to TRAJECTUM are documented here.

The project follows a milestone-based engineering release process. Entries describe product and model changes rather than every development commit.

## [Unreleased]

### Planned
- Expanded aerodynamic-analysis integrations.
- Additional reproducible reference cases.
- Stronger CAD-to-analysis interoperability.
- Experimental validation with physical test and flight data.
- Higher-fidelity flight-dynamics models where justified by the use case.

## [0.1.0-cdr] — 2026-09-21

### Added
- Modular aerospace engineering monorepo with separated core, physics, CAD, validation, reporting, API and web domains.
- Interactive web application for PDR/CDR engineering workflows.
- Vehicle geometry and CAD-reference handling.
- Component mass-property model and center-of-gravity calculation.
- Barrowman-style center-of-pressure and static-margin analysis.
- RK4-based trajectory analysis with variable mass, atmospheric model and time-varying thrust-curve support.
- Motor and propulsion configuration workflow.
- Recovery-model inputs and mission timeline.
- Flight-simulation / mission-control visualization.
- Engineering result export and reporting foundations.
- Spanish / English interface support.
- Continuous integration with automated Python tests, linting and web build checks.
- User guide, validation documentation and licensing documentation.

### Validation
- Added an independent trajectory cross-check against RocketPy 1.13.0 under matched first-order assumptions.
- Preserved explicit distinction between analytical verification, cross-tool verification and experimental validation.

### Engineering traceability
- Added explicit engineering statuses such as verified, derived, provisional, estimated, TBD and legacy/reference-only.
- Established a canonical CDR reference-case structure for vehicle geometry, mass properties, propulsion and aerodynamic assumptions.
- Retained legacy simulation fixtures only when clearly separated from the active design baseline.

### Licensing
- Published under the PolyForm Noncommercial License 1.0.0.
- Clarified commercial licensing and third-party-material scope.
