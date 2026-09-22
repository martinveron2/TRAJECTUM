# TRAJECTUM

<p align="center">
  <img src="assets/trajectum-rocket.svg" alt="TRAJECTUM aerospace engineering visualization" width="100%">
</p>

<p align="center">
  <strong>Aerospace Engineering & Flight Simulation Platform</strong><br>
  Modular engineering software for vehicle geometry, flight physics, trajectory analysis, aerodynamics, validation and technical reporting.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white" alt="Python 3.11+">
  <img src="https://img.shields.io/badge/TypeScript-Frontend-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-Web-61DAFB?logo=react&logoColor=111" alt="React">
  <img src="https://img.shields.io/badge/FastAPI-API-009688?logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/License-PolyForm%20Noncommercial%201.0.0-6C63FF" alt="License">
  <a href="https://github.com/martinveron2/TRAJECTUM/actions/workflows/ci.yml"><img src="https://github.com/martinveron2/TRAJECTUM/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  <a href="https://trajectum-vercel.vercel.app"><strong>Live Demo</strong></a>
  ·
  <a href="docs/USER_GUIDE.md">User Guide</a>
  ·
  <a href="docs/VALIDATION.md">Validation</a>
</p>

---

## Mission

TRAJECTUM is being built as a serious aerospace engineering platform rather than a single-purpose calculator. The repository is organized as a modular monorepo so that geometry, physics, CAD, APIs, validation, reporting and user interfaces can evolve independently while sharing a common engineering model.

Current focus: **`v0.1.0-cdr`**.

## Engineering Scope

- **Mass properties** — mass, center of gravity and configuration state.
- **Flight physics** — atmosphere, propulsion, stability, recovery and trajectory foundations.
- **Aerodynamics** — interfaces for low- and higher-fidelity aerodynamic analysis.
- **CAD & geometry** — vehicle geometry and engineering model integration.
- **Validation** — traceable engineering checks, reference cases and verification workflows.
- **Reporting** — reproducible technical outputs for design reviews.
- **Platform interfaces** — API and web layers for future interactive engineering workflows.

## Architecture

```mermaid
flowchart LR
    WEB[Web / Visualization] --> API[API Layer]
    API --> CORE[Engineering Core]

    CORE --> PHYS[Physics]
    CORE --> CAD[CAD & Geometry]
    CORE --> VAL[Validation]
    CORE --> REP[Reporting]

    PHYS --> MASS[Mass & CG]
    PHYS --> AERO[Aerodynamics]
    PHYS --> PROP[Propulsion]
    PHYS --> TRAJ[Trajectory]
    PHYS --> STAB[Stability / Recovery]

    CAD --> VEH[Vehicle Geometry]
    VAL --> TRACE[Traceability]
    REP --> DOCS[Engineering Reports]
```

## Technology Stack

| Layer | Technology |
| --- | --- |
| Engineering core | Python 3.11+ |
| API | FastAPI + Pydantic |
| Web interface | TypeScript + React + Vite |
| Containers | Docker / Docker Compose |
| Quality | Pytest, Ruff, MyPy |
| CI | GitHub Actions |
| Documentation | Markdown + Mermaid |

## Repository Layout

```text
TRAJECTUM/
├── backend/
│   ├── api/          # API contracts and services
│   ├── cad/          # CAD and geometry domain
│   ├── core/         # shared engineering core
│   ├── physics/      # flight physics engine
│   ├── reporting/    # technical reporting
│   └── validation/   # verification and validation
├── frontend/web/     # TypeScript / React interface
├── data/             # engineering datasets and vehicle definitions
├── docs/             # architecture, roadmap and validation docs
├── examples/         # reproducible engineering examples
└── infra/            # development / deployment infrastructure
```

## Documentation

- **[User Guide](docs/USER_GUIDE.md)** — operating workflow, engineering inputs, analysis, result interpretation and current model limitations.
- **[Fin Input Contract](docs/FIN_INPUT_CONTRACT.md)** — fin geometry and airfoil input conventions.
- **[Validation](docs/VALIDATION.md)** — independent cross-checks, validation scope and reproducibility notes.
- **[Engineering Evidence](docs/ENGINEERING_EVIDENCE.md)** — capability-by-capability evidence, status and limitations.
- **[Changelog](CHANGELOG.md)** — milestone history and release evolution.
- **[v0.1.0-cdr Release Notes](docs/RELEASE_NOTES_v0.1.0-cdr.md)** — scope, validation status and known limits.
- **[Licensing](LICENSING.md)** — public and commercial licensing scope.

## Development Roadmap

- [x] Consolidated modular monorepo
- [x] Initial API, CAD, core, physics, reporting and validation domains
- [x] Web application foundation
- [x] CI and container infrastructure
- [x] Source-available licensing model
- [ ] Expand flight-physics models and reference cases
- [ ] Strengthen CAD / vehicle geometry workflows
- [ ] Add aerodynamic analysis integrations
- [ ] Expand trajectory and stability visualization
- [ ] Publish reproducible validation cases
- [x] Release an interactive technical demonstration

## Validation

TRAJECTUM uses explicit reference cases and independent cross-checks to verify numerical behavior. The current CDR trajectory has been compared against **RocketPy 1.13.0** under matched first-order assumptions, with close agreement in apogee, burnout state, maximum velocity, Mach number and dynamic pressure.

This comparison is treated as an **independent cross-check**, not as experimental validation. See **[Validation](docs/VALIDATION.md)** for assumptions, numerical results and scope.

## Engineering Evidence

TRAJECTUM separates **software maturity** from **physical-model maturity**. Each major capability is tied to an explicit method, evidence source, status and limitation so that a passing build is never mistaken for experimental validation.

See **[Engineering Evidence](docs/ENGINEERING_EVIDENCE.md)** for the current verification matrix.

## Engineering Principles

TRAJECTUM aims for **traceability, reproducibility and physical transparency**. Numerical outputs should be tied to explicit assumptions, models, units and validation evidence. Higher-fidelity capabilities should be added without hiding the engineering reasoning behind black-box interfaces.

## Language Statistics

GitHub's language bar reflects source-code volume, not developer proficiency. This repository uses GitHub Linguist attributes to keep generated files, vendored dependencies and documentation from distorting the code-language statistics.

The active application stack is centered on **Python** for engineering computation and **TypeScript** for the web platform.

## Licensing

TRAJECTUM is source-available under the **PolyForm Noncommercial License 1.0.0**.

Use, modification and distribution for permitted noncommercial purposes are governed by the public license. Commercial use requires a separate written commercial license from the copyright holder. Third-party components remain subject to their own licenses and notices.

See [LICENSE](LICENSE), [LICENSING.md](LICENSING.md) and [NOTICE](NOTICE).

---

<p align="center">
  <strong>TRAJECTUM</strong><br>
  Aerospace Engineering · Flight Physics · Simulation · Validation
</p>
