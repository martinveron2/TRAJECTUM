# TRAJECTUM Repository Map

## Active now
- trajectum-core
- trajectum-physics
- trajectum-cad
- trajectum-validation
- trajectum-data
- trajectum-docs

## Bootstrap / future-facing
- trajectum-api
- trajectum-web
- trajectum-reporting
- trajectum-sdk
- trajectum-infra
- trajectum-examples

## Dependency direction

core <- physics
core <- cad
data -> physics
data -> validation
physics -> validation

Frontend must consume API contracts and must not implement engineering physics.
