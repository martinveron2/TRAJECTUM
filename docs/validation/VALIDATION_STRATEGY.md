# Validation Strategy

TRAJECTUM must not become a black box.

## Validation layers

1. **Unit** — equations, units, limits and sign conventions.
2. **Analytical** — hand-calculation fixtures for CG, CP, atmosphere and simple trajectories.
3. **Numerical** — convergence checks versus integration step and tolerances.
4. **Cross-tool** — OpenRocket and RocketPy reference cases when equivalent assumptions can be matched.
5. **Experimental** — physical CG, measured mass, flight data and telemetry when available.
6. **Regression** — frozen reference cases prevent silent changes in validated outputs.

A comparison is valid only when model assumptions, geometry, atmosphere, motor input, coordinate system and reference datum are aligned.
