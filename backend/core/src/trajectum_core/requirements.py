from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ProjectRequirement:
    id: str
    title: str
    target: str
    methods: tuple[str, ...]


UTN_FRH_2026_REQUIREMENTS: tuple[ProjectRequirement, ...] = (
    ProjectRequirement("R1", "Altitud Mínima", "h_req >= 150 m @ 85° elevación", ("A", "E")),
    ProjectRequirement("R2", "Aterrizaje Controlado", "V_imp <= 5 m/s", ("A", "E")),
    ProjectRequirement("R3", "Diámetro Propulsivo", "Contenedor d_ext = 50 mm", ("I",)),
    ProjectRequirement("R4", "Montaje Pre-Lanzamiento Propulsor", "Montaje verificable antes del lanzamiento", ("I",)),
    ProjectRequirement("R5", "Longitud Mínima Cohete", "L >= 800 mm", ("I",)),
    ProjectRequirement("R6", "Cofia Desmontable para Paracaídas", "Acceso y liberación del sistema de recuperación", ("I", "E")),
    ProjectRequirement("R7", "Carga Útil / Módulo Inercial", "100 g TBC", ("I", "A")),
    ProjectRequirement("R8", "Máxima Presión Dinámica", "MaxQ, t_MaxQ, h_MaxQ", ("A",)),
    ProjectRequirement("R9", "Sistema de Coordenadas Cátedra", "+X axial, origen en base", ("A",)),
    ProjectRequirement("R10", "Identificación Oficial", "2x Logos UTN FRH opuestos", ("I",)),
    ProjectRequirement("R11", "Alta Visibilidad", "2x Franjas Reflectivas", ("I",)),
)
