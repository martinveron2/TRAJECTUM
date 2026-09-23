# Contributing to TRAJECTUM

TRAJECTUM welcomes technically grounded contributions in aerospace engineering, flight simulation, numerical methods, validation, CAD/geometry workflows and engineering UX.

## Good contribution areas

- trajectory integration and numerical methods,
- atmosphere and aerodynamic drag,
- propulsion and variable-mass modelling,
- CG / CP and static stability,
- recovery modelling,
- validation and independent cross-checks,
- CAD / geometry data flow,
- reproducible engineering examples,
- tests, documentation and engineering UX.

## Contribution standard

A useful contribution should make assumptions, units, equations, inputs and limitations explicit. Passing software tests alone should not be presented as physical validation.

When changing an engineering model, include:
1. what changed,
2. the governing assumption or method,
3. expected effect on outputs,
4. a test or reproducible example,
5. any new limitation introduced.

## Validation language

Use **verification**, **cross-check** or **comparison** when the evidence is numerical or cross-tool.

Use **experimental validation** only when the claim is supported by appropriate physical test or flight evidence.

## Workflow

1. Open an issue or Engineering Review thread when the change affects modelling assumptions.
2. Fork or branch from the current development baseline.
3. Keep changes focused and reproducible.
4. Add or update tests where practical.
5. Run the relevant local checks before opening a pull request.
6. In the PR, describe engineering impact separately from software impact.

## Engineering Review

For technical criticism without a code contribution, use:

https://github.com/martinveron2/TRAJECTUM/issues/52

## Live application

https://trajectum-vercel.vercel.app

Thanks for helping make the engineering more transparent, reproducible and useful.
