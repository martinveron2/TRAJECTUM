from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from trajectum_physics import (
    MassPoint,
    center_of_gravity,
    combine_cp,
    static_margin,
    tangent_ogive_cp,
    trapezoidal_fin_set_cp,
)

app = FastAPI(title="TRAJECTUM API", version="0.1.0-dev0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class Capability(BaseModel):
    name: str
    state: str


class MassItemIn(BaseModel):
    name: str
    mass_g: float = Field(gt=0)
    x_cg_mm: float = Field(ge=0)




class CGRequest(BaseModel):
    masses: list[MassItemIn]


class CGResponse(BaseModel):
    total_mass_g: float
    cg_x_mm_from_nose: float


class AnalysisRequest(BaseModel):
    nose_length_mm: float = Field(gt=0)
    body_diameter_mm: float = Field(gt=0)
    fin_count: int = Field(ge=3)
    fin_root_chord_mm: float = Field(gt=0)
    fin_tip_chord_mm: float = Field(gt=0)
    fin_span_mm: float = Field(gt=0)
    fin_sweep_mm: float = Field(ge=0)
    fin_leading_edge_x_mm: float = Field(ge=0)
    masses: list[MassItemIn]


class AnalysisResponse(BaseModel):
    total_mass_g: float
    cg_x_mm_from_nose: float
    cp_x_mm_from_nose: float
    static_margin_calibers: float
    nose_cp_x_mm: float
    fins_cp_x_mm: float


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="trajectum-api", version="0.1.0-dev0")


@app.get("/v1/capabilities", response_model=list[Capability])
def capabilities() -> list[Capability]:
    return [
        Capability(name="projects", state="planned"),
        Capability(name="vehicles", state="active"),
        Capability(name="simulations", state="partial"),
        Capability(name="jobs", state="planned"),
        Capability(name="results", state="partial"),
        Capability(name="validation", state="planned"),
    ]




@app.post("/v1/analysis/cg", response_model=CGResponse)
def analyze_cg(request: CGRequest) -> CGResponse:
    masses = tuple(
        MassPoint(name=item.name, mass_kg=item.mass_g / 1000.0, x_m=item.x_cg_mm / 1000.0)
        for item in request.masses
    )
    mass = center_of_gravity(masses)
    return CGResponse(
        total_mass_g=mass.total_mass_kg * 1000.0,
        cg_x_mm_from_nose=mass.cg_x_m * 1000.0,
    )


@app.post("/v1/analysis/cg-cp", response_model=AnalysisResponse)
def analyze_cg_cp(request: AnalysisRequest) -> AnalysisResponse:
    masses = tuple(
        MassPoint(name=item.name, mass_kg=item.mass_g / 1000.0, x_m=item.x_cg_mm / 1000.0)
        for item in request.masses
    )
    mass = center_of_gravity(masses)

    nose = tangent_ogive_cp(request.nose_length_mm / 1000.0)
    fins = trapezoidal_fin_set_cp(
        count=request.fin_count,
        body_diameter_m=request.body_diameter_mm / 1000.0,
        span_m=request.fin_span_mm / 1000.0,
        root_chord_m=request.fin_root_chord_mm / 1000.0,
        tip_chord_m=request.fin_tip_chord_mm / 1000.0,
        sweep_length_m=request.fin_sweep_mm / 1000.0,
        leading_edge_x_m=request.fin_leading_edge_x_mm / 1000.0,
    )
    cp = combine_cp(nose, fins)
    margin = static_margin(
        cg_x_m=mass.cg_x_m,
        cp_x_m=cp.x_cp_m,
        body_diameter_m=request.body_diameter_mm / 1000.0,
    )
    return AnalysisResponse(
        total_mass_g=mass.total_mass_kg * 1000.0,
        cg_x_mm_from_nose=mass.cg_x_m * 1000.0,
        cp_x_mm_from_nose=cp.x_cp_m * 1000.0,
        static_margin_calibers=margin.calibers,
        nose_cp_x_mm=nose.x_cp_m * 1000.0,
        fins_cp_x_mm=fins.x_cp_m * 1000.0,
    )
