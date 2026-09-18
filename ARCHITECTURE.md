# Architecture

Top-level domains:

- `backend/core`
- `backend/physics`
- `backend/cad`
- `backend/validation`
- `backend/api`
- `backend/reporting`
- `frontend/web`
- `packages/sdk`
- `data`
- `infra`
- `docs`
- `examples`

Physics remains independent from frontend and CAD vendors. Cross-module contracts are explicit and versioned.
