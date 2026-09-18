# TRAJECTUM Infrastructure

Infrastructure is versioned with the product but deployment remains environment-gated.

## Planned layers

- local development via Docker Compose
- CI via GitHub Actions
- staging / production AWS via IaC
- centralized logs, metrics and job telemetry
- secrets only through environment/secret stores, never committed

No paid cloud resources are provisioned by this scaffold.
