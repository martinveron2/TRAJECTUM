# ADR-001: RK4 integration for the current trajectory solver

- **Status:** Accepted for the current reference implementation
- **Scope:** Documentation of an existing engineering decision
- **Functional change:** None

## Context

TRAJECTUM's current trajectory workflow uses a two-dimensional point-mass flight model. The active CDR reference case identifies the trajectory method as **RK4 2D** with a numerical step of **dt = 0.002 s**, standard-atmosphere handling, variable mass, and the A-100 RN/KNDX thrust curve.

The web reporting layer also identifies the integration method as fourth-order Runge-Kutta (RK4).

This ADR records the existing implementation choice. It does not change the solver, equations, constants, reference-case inputs, or numerical outputs.

## Decision

Retain the existing fourth-order Runge-Kutta integration method for the current trajectory solver and preserve the currently configured reference-case time step.

The documentation should describe RK4 as the numerical integration method used by the current implementation, not as proof of physical-model fidelity.

## Alternatives considered

Euler, Verlet-family methods, adaptive Runge-Kutta schemes, and higher-order or specialized flight-dynamics solvers are recognized alternatives.

No formal comparative benchmark demonstrating that RK4 is superior to Euler, Verlet, or every other integration strategy is claimed in this ADR.

## Consequences

### Positive

- The numerical method is explicit and traceable.
- The current CDR reference case is reproducible against a named integration method and time step.
- Solver choice is separated from claims about physical-model validation.

### Limitations

- Numerical integration accuracy does not by itself validate aerodynamic, propulsion, recovery, or mass-property assumptions.
- A fixed time step is an implementation choice and should not be interpreted as universally optimal.
- Changes to the solver or time step require a separate technical change with regression evidence.

## Validation / evidence

Existing repository evidence includes:

- the canonical CDR reference-case metadata describing `RK4 2D, dt=0.002 s`;
- the web reporting layer identifying Runge-Kutta fourth order as the integration method;
- the validation documentation describing an independent cross-tool trajectory comparison.

The cross-tool comparison is evidence of numerical consistency under matched assumptions. It is not experimental validation.

## Change-control rule

Any future modification to the integration method, numerical step, governing equations, reference-case inputs, or expected outputs is outside the scope of repository-presentation work and should be reviewed as an engineering change.
