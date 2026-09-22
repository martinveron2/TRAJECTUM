# Repository Presentation Audit

Status: documentation-only audit. No runtime files, physics, numerical parameters, frontend logic, backend logic, deployment configuration, or reference-case data are modified by this document.

## Safety rule

The current `main` branch is treated as the functional baseline. Repository cleanup must not move or rename files until every runtime, import, CI, Vercel, script, and documentation reference has been checked.

If a proposed relocation is not proven safe, it remains in place.

## Root audit

| Element | State | Recommended action | Risk | Known references |
| --- | --- | --- | --- | --- |
| `.github/` | Correct in root | Keep | Low | GitHub Actions |
| `.gitattributes` | Correct in root | Keep | Low | Git / Linguist |
| `.gitignore` | Correct in root | Keep | Low | Git |
| `ACTUALIZAR_E_INICIAR.bat` | Operational entrypoint | Keep in place for now | High if moved | Local Windows workflow |
| `ARCHITECTURE.md` | Documentation | Candidate for later consolidation only after link audit | Medium | README/docs may reference it |
| `CHANGELOG.md` | Correct in root | Keep | Low | README |
| `LICENSE` | Correct in root | Keep | Low | Licensing |
| `LICENSING.md` | Correct in root | Keep | Low | README |
| `NOTICE` | Correct in root | Keep | Low | License notice |
| `README.md` | Correct in root | Improve presentation only | Low | Repository landing page |
| `assets/` | Active README assets | Keep in place until references are audited | Medium if moved | README |
| `backend/` | Runtime/source | Do not move | High | Imports, CI, API |
| `cad/` | Engineering reference data | Do not move in presentation pass | High | Documentation / engineering workflow |
| `data/` | Runtime/reference data | Do not move | High | Vercel and application |
| `docs/` | Documentation | Keep | Low | README |
| `examples/` | Examples | Keep | Low | Developer workflow |
| `frontend/` | Runtime/source | Do not move | High | Vercel build |
| `infra/` | Deployment/dev infrastructure | Keep | Medium | Docker workflow |
| `main.py` | Deployment/runtime entrypoint | Do not move | Critical | Vercel function configuration |
| `requirements.txt` | Deployment/runtime dependency file | Do not move | Critical | Vercel/Python runtime |
| `scripts/` | Operational scripts | Do not move in presentation pass | High | Local/AWS workflow |
| `vercel.json` | Deployment configuration | Do not move or edit in presentation pass | Critical | Vercel |

## Verified path-sensitive items

The current Vercel configuration explicitly references:

- `frontend/web` as the build working path;
- `main.py` as the function entrypoint;
- `frontend/web/dist/**`;
- `data/reference-cases/utn-frh-g07/vehicle.cdr.json`.

These paths are therefore frozen for the presentation-only pass.

The current CI explicitly references:

- `backend/core`;
- `backend/physics`;
- `backend/cad`;
- `backend/validation`;
- `backend/api`;
- `backend/reporting`;
- `frontend/web`.

These paths are also frozen for the presentation-only pass.

## Findings requiring a decision

1. **Version identity**
   - README / release documentation refer to `v0.1.0-cdr`.
   - `frontend/web/package.json` reports `0.1.0-dev0`.
   - Do not normalize these automatically.
   - **[DECISIÓN PENDIENTE: definir si la versión pública del producto y la versión interna del paquete web deben coincidir.]**

2. **Hero image**
   - README currently uses `assets/trajectum-rocket.svg`.
   - The requested documentation standard prefers a real product capture.
   - **[DECISIÓN PENDIENTE: seleccionar una captura real de TRAJECTUM antes de reemplazar el hero.]**

3. **Validation baseline**
   - Validation documentation must remain tied to a named configuration revision.
   - Numerical differences between historical and current CDR runs must not be silently rewritten as part of repository cosmetics.
   - **[DECISIÓN PENDIENTE: reconcile validation documentation in a separate technical change, not in this presentation pass.]**

4. **CITATION.cff**
   - Author and license are confirmed in repository notices.
   - Version identity still needs the decision above.
   - **[DECISIÓN PENDIENTE: create CITATION.cff after public version is confirmed.]**

## Safe scope for the current pass

Allowed without changing behavior:

- README wording and layout;
- documentation index;
- ADR documentation;
- citation preparation after version confirmation;
- badges and links after verification;
- Markdown consistency;
- repository audit records.

Not allowed in this pass:

- moving or renaming runtime files;
- changing imports;
- changing Vercel or CI paths;
- changing physics or numerical code;
- changing reference-case JSON;
- changing frontend behavior;
- changing API behavior;
- changing equations, constants, geometry, masses, drag, thrust, integration settings, or results.

## Acceptance condition

Before any future path move is merged, the change must demonstrate:

1. all affected references identified;
2. CI passes;
3. frontend build passes;
4. deployment paths are updated intentionally;
5. reference-case outputs are unchanged unless the change is explicitly technical rather than cosmetic.
