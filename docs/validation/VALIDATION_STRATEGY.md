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

## Comparison contract

- Use a combined acceptance limit: `absolute + relative × |reference|`.
- State the engineering rationale for every tolerance; a number without rationale is not evidence.
- Reject non-finite inputs and results (`NaN`, positive infinity and negative infinity).
- Use absolute tolerance for a zero reference; relative error is undefined at zero.
- Pre-align sampled series before comparison and record the alignment/interpolation method.
- Preserve the exact input-artifact SHA-256 in every comparison result.

## Result states

- **Passed** means one declared comparison met one declared tolerance.
- **Failed** means the comparison executed and exceeded that tolerance.
- **Pending** means an input or reference is unavailable; it is not a numerical result.
- **Not comparable** means assumptions, datum, units or configuration could not be aligned.

Passing a unit test does not validate the physical model. Model validity requires the analytical,
numerical, cross-tool and experimental evidence appropriate to the intended claim.
