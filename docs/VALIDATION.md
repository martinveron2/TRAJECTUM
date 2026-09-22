# Validation

TRAJECTUM treats validation as a traceable engineering activity rather than a visual or UI-level check. Reference cases should record the active geometry, mass model, propulsion inputs, aerodynamic assumptions, numerical method and comparison source.

## Independent trajectory cross-check

The current CDR reference trajectory was independently cross-checked with **RocketPy 1.13.0** using matched first-order assumptions:

- 3-DOF point-mass flight model;
- standard atmosphere and zero wind;
- launch angle: 85°;
- body diameter: 63 mm;
- effective drag coefficient: Cd = 0.345;
- initial mass: 1.590 kg;
- post-burnout mass: 1.450 kg;
- propellant mass: 0.140 kg;
- motor dry mass: 0.350 kg;
- burn time: 0.50 s;
- the same time-varying A-100 RN/KNDX thrust curve;
- numerical time-step control matched closely to the TRAJECTUM reference run.

### Comparison

| Quantity | TRAJECTUM | RocketPy | Difference |
| --- | ---: | ---: | ---: |
| Apogee | 662.10 m | 669.60 m | +7.50 m (+1.13%) |
| Time to apogee | 11.28 s | 11.34 s | +0.06 s |
| Maximum speed | 128.95 m/s | 129.83 m/s | +0.88 m/s (+0.69%) |
| Maximum Mach | 0.379 | 0.382 | +0.003 |
| Maximum dynamic pressure | 10.15 kPa | 10.29 kPa | +0.14 kPa |
| Burnout altitude | 36.56 m | 36.74 m | +0.18 m |
| Burnout speed | 128.73 m/s | 129.62 m/s | +0.89 m/s |
| Burnout dynamic pressure | 10.11 kPa | 10.25 kPa | +0.14 kPa |

The comparison is an **independent cross-check under matched assumptions**, not a claim of full experimental validation. Agreement between two simulation tools does not replace motor testing, aerodynamic characterization, mass-property verification or flight-test data.

## Validation policy

For future reference cases, TRAJECTUM should distinguish among:

1. **Analytical verification** — comparison against closed-form or known limiting cases.
2. **Cross-tool verification** — comparison against an independent implementation or external simulator.
3. **Input verification** — confirmation of geometry, mass properties and propulsion data against drawings, CAD, measurement or test evidence.
4. **Experimental validation** — comparison against physical test or flight data.

Numerical results should remain tied to a configuration revision so that a comparison can be reproduced after the vehicle model changes.
