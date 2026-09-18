# Fin input contract

Fin definition is split into two independent inputs: **planform geometry** and **cross-section profile**.

Planform geometry contains count, root chord, tip chord, span, sweep and axial location. Cross-section profile can be either a standard NACA 4-digit designation or a custom normalized contour.

Example using a NACA profile:

```json
{
  "count": 4,
  "root_chord_mm": 80,
  "tip_chord_mm": 40,
  "span_mm": 50,
  "sweep_length_mm": 20,
  "leading_edge_x_mm": 760,
  "airfoil": {
    "type": "naca4",
    "designation": "NACA 0012"
  }
}
```

Example using a custom section:

```json
{
  "airfoil": {
    "type": "custom",
    "designation": "UTN-G07-v1",
    "custom_coordinates": [
      [1.0, 0.0],
      [0.5, 0.08],
      [0.0, 0.0],
      [0.5, -0.08],
      [1.0, 0.0]
    ]
  }
}
```

Custom coordinates are normalized as `x/c, y/c`, so the same section can be scaled automatically to root or tip chord.

The current Barrowman CP implementation uses fin **planform geometry**. The airfoil cross-section is retained for CAD, manufacturing, drag refinement and later higher-fidelity aerodynamics; TRAJECTUM does not pretend that changing NACA section changes the current first-order Barrowman CP model.

For the canonical UTN-FRH-G07 CDR case, the professor-specified NACA designation remains `TBD` until the exact designation is confirmed. It should then be entered directly in the case file rather than hard-coded in the solver.
