# TRAJECTUM User Guide

TRAJECTUM is a modular aerospace engineering and flight-simulation platform for configuring experimental vehicles, evaluating mass properties and stability, running trajectory analysis, and reviewing engineering results through an interactive web interface.

This guide describes the current **v0.1.0-cdr** workflow. The interface supports Spanish and English; labels may therefore appear in either language.

---

## 1. Workflow overview

A typical TRAJECTUM workflow is:

1. Review or load the vehicle geometry.
2. Confirm mass properties and component locations.
3. Review the propulsion model.
4. Confirm aerodynamic and recovery inputs.
5. Run the CDR analysis.
6. Inspect CG, CP, static margin and trajectory results.
7. Open the flight-simulation view.
8. Export or document the results.

TRAJECTUM is designed to keep engineering assumptions, provisional values and verified inputs visible rather than silently replacing missing information.

---

## 2. Vehicle geometry

The vehicle definition contains the principal geometric parameters used by the physics engine, including:

- assembled vehicle length;
- body diameter;
- nose geometry;
- fin count and planform;
- fin axial position;
- CAD-derived component dimensions.

The PDR vehicle view provides synchronized schematic, CAD and component views. Where available, CG and CP positions are shown relative to the current vehicle geometry.

### CAD import

The current interface includes a CAD interoperability entry point. Imported or reference geometry should be checked against the active engineering baseline before it is used for analysis.

A CAD model or drawing should not be treated as authoritative merely because it is present in the repository. TRAJECTUM distinguishes verified, derived and provisional engineering data.

---

## 3. Mass properties and center of gravity

The mass model combines component mass and axial position to calculate the vehicle center of gravity.

For each component, TRAJECTUM may use one of several position sources:

- measured or explicitly entered mass location;
- geometry-derived centroid;
- drawing-derived axial station;
- uniform axial distribution;
- specialized geometry such as a nose shell or fin planform.

The interface can display component-level mass and xCG information as well as the resulting total mass and vehicle CG.

### Datum

TRAJECTUM can display positions from the nose or from the support/base reference depending on the active view. Always confirm the selected datum before comparing values with external calculations or CAD software.

### Engineering practice

For final design-review work, provisional xCG values should be replaced by measured balance data or validated CAD mass properties when those become available.

---

## 4. Center of pressure and static stability

The current CDR workflow calculates center of pressure using a Barrowman-style first-order aerodynamic model based on nose and fin geometry.

The stability view presents:

- **CG** — center of gravity;
- **CP** — center of pressure;
- **Static margin** — separation between CG and CP normalized by body diameter.

The current model is intended for preliminary engineering analysis. It should be interpreted together with the documented assumptions and the fidelity limits of the aerodynamic model.

Changing an airfoil designation does not, by itself, imply a higher-fidelity CP solution. The current first-order CP model is driven primarily by vehicle and fin planform geometry.

---

## 5. Propulsion

The propulsion panel defines the active motor model. Inputs may include:

- motor designation;
- burn time;
- total impulse;
- maximum thrust;
- propellant mass;
- dry mass;
- thrust curve when available.

Where a thrust curve is available, TRAJECTUM can use the time-varying thrust history instead of reducing the motor to a single constant-thrust value.

Derived quantities should be checked against the source motor data before the configuration is frozen for a design review.

---

## 6. Aerodynamic drag

The vehicle drag coefficient **Cd** is an explicit model input in the current workflow.

The interface identifies whether a value is estimated, provisional or otherwise derived from a reference method. A provisional Cd is useful for iteration, but should not be interpreted as an experimentally validated coefficient.

For higher-confidence work, update Cd using a documented method, external aerodynamic analysis, test data, or an independently validated reference.

---

## 7. Running the CDR analysis

When the required inputs are available, use **Run Full Analysis / Ejecutar análisis completo**.

The analysis pipeline evaluates the current configuration and can return:

- total mass;
- CG;
- CP;
- static margin;
- apogee;
- time to apogee;
- maximum velocity;
- maximum Mach number;
- maximum dynamic pressure;
- recovery and landing metrics when the required recovery inputs are available;
- a mission timeline for the flight-simulation interface.

If required geometry, mass or propulsion information is unresolved, TRAJECTUM is designed to block or qualify the analysis rather than silently invent values.

---

## 8. Trajectory model

The current trajectory workflow uses a numerical integration model for the ascent and flight state.

Typical configuration inputs include:

- launch angle;
- vehicle mass;
- motor thrust history;
- aerodynamic drag;
- atmospheric properties;
- recovery parameters.

The trajectory result should be interpreted as a model prediction under the active assumptions, not as a guarantee of actual flight performance.

Independent cross-checks, ground tests and real-flight data are encouraged as part of the validation process.

---

## 9. Flight simulation

When an analysis produces a valid mission timeline, the flight view can replay the calculated mission.

Depending on the active configuration, the interface may present telemetry such as:

- mission time;
- altitude;
- velocity;
- Mach number;
- dynamic or acceleration-related flight indicators;
- motor burnout;
- apogee;
- recovery events.

The flight view is a visualization of the computed engineering result. It does not replace the underlying numerical outputs or validation evidence.

---

## 10. Recovery

Recovery inputs may include:

- parachute drag coefficient;
- parachute area;
- deployment altitude;
- deployment delay.

When configured, TRAJECTUM can estimate recovery-phase timing and landing quantities. These outputs are sensitive to the assumed parachute model and deployment logic and should be validated independently before operational use.

---

## 11. Input-status terminology

TRAJECTUM uses explicit engineering-status language to preserve traceability.

| Status | Meaning |
| --- | --- |
| **Verified** | Supported by an identified drawing, CAD source, measurement or other accepted project evidence. |
| **Derived** | Calculated from other identified inputs or geometry. |
| **Provisional** | Temporarily accepted for analysis but still subject to confirmation or replacement. |
| **Estimated** | Based on an engineering estimate or approximate source rather than direct verification. |
| **TBD / Pending** | Required information has not yet been resolved. |
| **Legacy / Reference only** | Retained for traceability or testing and not intended to represent the active design baseline. |

These labels are part of the engineering model, not merely UI decoration.

---

## 12. Interpreting results

Before using a result in a report or design decision, confirm:

- the vehicle geometry matches the intended configuration;
- the mass model represents the actual assembly;
- the coordinate datum is understood;
- the motor data correspond to the intended propulsion configuration;
- Cd and recovery parameters have an identified source;
- no unresolved input is being mistaken for a verified value;
- the model fidelity is appropriate for the decision being made.

For engineering reviews, record the configuration revision together with the numerical result.

---

## 13. Export and reporting

TRAJECTUM is structured so that analysis outputs can be reused in technical reporting and verification workflows.

When exporting or documenting results, retain:

- configuration or revision identifier;
- principal input assumptions;
- units;
- CG and CP datum;
- numerical method;
- validation or comparison source where applicable.

This makes a result reproducible rather than just visually repeatable.

---

## 14. Limitations of the current release

The current release is an evolving engineering platform. Depending on the active module and case, limitations may include:

- first-order aerodynamic models;
- provisional aerodynamic coefficients;
- simplified recovery models;
- geometry or mass properties awaiting final CAD or measurement;
- absence of full six-degree-of-freedom vehicle dynamics in the current workflow;
- reference cases that are intentionally retained for verification and regression testing.

A result marked provisional or derived should remain traceable as such until replaced by stronger evidence.

---

## 15. Troubleshooting

### The full analysis button is disabled

Check whether all required geometry, fin-planform, mass and propulsion inputs are available.

### CG is shown but the value is not final

Inspect component xCG sources. Drawing-derived or estimated stations may still be active.

### CP changes after updating fin geometry

This is expected. The current Barrowman-style model responds directly to fin planform and axial location.

### A result differs from another simulator

Confirm that both tools use the same:

- mass and mass depletion;
- geometry;
- launch angle;
- thrust curve;
- Cd model;
- atmosphere;
- recovery assumptions;
- numerical stopping conditions.

A difference between tools is not automatically an error; it should be traced to assumptions and model formulation.

### A legacy vehicle or old value appears in the repository

Check its status and location. TRAJECTUM retains selected historical or test fixtures for traceability and regression testing. The active baseline should be identified separately from legacy reference data.

---

## 16. Engineering responsibility

TRAJECTUM is an engineering analysis tool. Its outputs depend on the quality of the inputs and on the assumptions and fidelity of the selected models.

Results should be reviewed by qualified users and supported by independent verification, testing and appropriate safety procedures before being used for real-world flight or other safety-critical decisions.

---

## Related documentation

- [README](../README.md)
- [Fin input contract](FIN_INPUT_CONTRACT.md)
- [Licensing](../LICENSING.md)
- [License](../LICENSE)
