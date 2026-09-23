# Engineering data catalog

All engineering datasets stay in the canonical `TRAJECTUM` repository and are separated by
provenance, not by software module.

| Path | Content | Minimum provenance |
|---|---|---|
| `motors/` | Manufacturer or measured thrust/mass data | motor identity, source, revision, units |
| `materials/` | Material properties | process, specimen/standard, temperature, source |
| `atmosphere/` | Standard or measured atmosphere inputs | model/station, date, altitude datum |
| `vehicles/` | Versioned vehicle inputs | geometry revision, mass state, datum, units |
| `flights/` | Immutable flight observations | vehicle revision, time base, sensors, calibration |
| `experiments/` | Bench and subsystem tests | procedure, equipment, calibration, uncertainty |
| `reference-cases/` | Reproducible validation bundles | inputs, expected outputs, tolerances, evidence |

New records use `schemas/engineering-record.schema.json`. A missing engineering input is recorded
as `status: "pending"`; it is never replaced by a guessed numerical value. Binary/raw telemetry
must include a sidecar metadata record and a checksum.
