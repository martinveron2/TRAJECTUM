from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from trajectum_cad import CAD_FORMATS
from trajectum_physics import (
    ComponentMassProperty,
    MassPoint,
    Motor,
    analyze_vehicle,
    axial_uniform_cg,
    center_of_gravity,
    combine_component_mass_properties,
    combine_cp,
    static_margin,
    tangent_ogive_cp,
    tangent_ogive_shell_cg,
    trapezoidal_fin_planform_cg_x,
    trapezoidal_fin_set_cp,
)

app = FastAPI(title="TRAJECTUM API", version="0.2.0-dev0")
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


class CadFormatResponse(BaseModel):
    name: str
    extensions: list[str]
    representation: str
    native_parse: bool
    recommended_path: str


class MassItemIn(BaseModel):
    name: str
    mass_g: float = Field(gt=0)
    x_cg_mm: float = Field(ge=0)



class ComponentGeometryIn(BaseModel):
    name: str
    kind: str
    mass_g: float = Field(gt=0)
    x_start_mm: float | None = None
    x_end_mm: float | None = None
    length_mm: float | None = None
    base_radius_mm: float | None = None
    leading_edge_x_mm: float | None = None
    root_chord_mm: float | None = None
    tip_chord_mm: float | None = None
    span_mm: float | None = None
    sweep_mm: float | None = None


class ComponentCGOut(BaseModel):
    name: str
    mass_g: float
    x_cg_mm: float
    source: str


class ComponentCGResponse(BaseModel):
    components: list[ComponentCGOut]
    total_mass_g: float
    total_cg_mm: float


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


class FullAnalysisRequest(AnalysisRequest):
    launch_angle_deg: float = Field(gt=0, le=90)
    cd: float = Field(gt=0)
    motor_burn_time_s: float = Field(default=0.5, gt=0)
    motor_total_impulse_n_s: float = Field(default=207.0, gt=0)
    motor_propellant_mass_g: float = Field(default=140.0, gt=0)
    motor_dry_mass_g: float = Field(default=350.0, gt=0)

class AnalysisResponse(BaseModel):
    total_mass_g: float
    cg_x_mm_from_nose: float
    cp_x_mm_from_nose: float
    static_margin_calibers: float
    nose_cp_x_mm: float
    fins_cp_x_mm: float


class FullAnalysisResponse(BaseModel):
    total_mass_g: float
    cg_x_mm_from_nose: float
    cp_x_mm_from_nose: float
    static_margin_calibers: float
    apogee_m: float
    time_to_apogee_s: float
    max_q_pa: float
    max_speed_m_s: float
    max_mach: float


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="trajectum-api", version="0.2.0-dev0")


@app.get("/v1/capabilities", response_model=list[Capability])
def capabilities() -> list[Capability]:
    return [
        Capability(name="vehicles", state="active"),
        Capability(name="simulations", state="active"),
        Capability(name="results", state="active"),
        Capability(name="cg_cp", state="active"),
        Capability(name="trajectory", state="active"),
        Capability(name="cad_interop", state="adapter-foundation"),
        Capability(name="validation", state="partial"),
    ]

@app.get("/v1/cad/formats", response_model=list[CadFormatResponse])
def cad_formats() -> list[CadFormatResponse]:
    return [
        CadFormatResponse(
            name=item.name,
            extensions=list(item.extensions),
            representation=item.representation,
            native_parse=item.native_parse,
            recommended_path=item.recommended_path,
        )
        for item in CAD_FORMATS
    ]




@app.post("/v1/components/cg", response_model=ComponentCGResponse)
def component_cg(request: list[ComponentGeometryIn]) -> ComponentCGResponse:
    calculated: list[ComponentMassProperty] = []
    for item in request:
        if item.kind == "axial_uniform":
            if item.x_start_mm is None or item.x_end_mm is None:
                raise ValueError("axial_uniform requires x_start_mm and x_end_mm")
            x = axial_uniform_cg(x_start_m=item.x_start_mm / 1000.0, x_end_m=item.x_end_mm / 1000.0)
            source = "geometry:axial_uniform"
        elif item.kind == "tangent_ogive_shell":
            if item.length_mm is None or item.base_radius_mm is None:
                raise ValueError("tangent_ogive_shell requires length_mm and base_radius_mm")
            x = tangent_ogive_shell_cg(length_m=item.length_mm / 1000.0, base_radius_m=item.base_radius_mm / 1000.0)
            source = "geometry:tangent_ogive_shell"
        elif item.kind == "trapezoidal_fin_set":
            values = [item.leading_edge_x_mm, item.root_chord_mm, item.tip_chord_mm, item.span_mm, item.sweep_mm]
            if any(value is None for value in values):
                raise ValueError("trapezoidal_fin_set requires leading edge, root/tip chord, span and sweep")
            x = trapezoidal_fin_planform_cg_x(
                leading_edge_x_m=item.leading_edge_x_mm / 1000.0,
                root_chord_m=item.root_chord_mm / 1000.0,
                tip_chord_m=item.tip_chord_mm / 1000.0,
                span_m=item.span_mm / 1000.0,
                sweep_m=item.sweep_mm / 1000.0,
            )
            source = "geometry:trapezoidal_fin_planform"
        else:
            raise ValueError(f"Unsupported component geometry kind: {item.kind}")
        calculated.append(ComponentMassProperty(item.name, item.mass_g / 1000.0, x, source))
    total = combine_component_mass_properties(tuple(calculated))
    return ComponentCGResponse(
        components=[ComponentCGOut(name=c.name, mass_g=c.mass_kg * 1000.0, x_cg_mm=c.x_cg_m * 1000.0, source=c.source) for c in calculated],
        total_mass_g=total.total_mass_kg * 1000.0,
        total_cg_mm=total.cg_x_m * 1000.0,
    )


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
    margin = static_margin(cg_x_m=mass.cg_x_m, cp_x_m=cp.x_cp_m, body_diameter_m=request.body_diameter_mm / 1000.0)
    return AnalysisResponse(
        total_mass_g=mass.total_mass_kg * 1000.0,
        cg_x_mm_from_nose=mass.cg_x_m * 1000.0,
        cp_x_mm_from_nose=cp.x_cp_m * 1000.0,
        static_margin_calibers=margin.calibers,
        nose_cp_x_mm=nose.x_cp_m * 1000.0,
        fins_cp_x_mm=fins.x_cp_m * 1000.0,
    )

@app.post("/v1/analysis/full", response_model=FullAnalysisResponse)
def analyze_full(request: FullAnalysisRequest) -> FullAnalysisResponse:
    masses = tuple(
        MassPoint(name=item.name, mass_kg=item.mass_g / 1000.0, x_m=item.x_cg_mm / 1000.0)
        for item in request.masses
    )
    result = analyze_vehicle(
        masses=masses,
        nose_length_m=request.nose_length_mm / 1000.0,
        body_diameter_m=request.body_diameter_mm / 1000.0,
        fin_count=request.fin_count,
        fin_root_chord_m=request.fin_root_chord_mm / 1000.0,
        fin_tip_chord_m=request.fin_tip_chord_mm / 1000.0,
        fin_span_m=request.fin_span_mm / 1000.0,
        fin_sweep_m=request.fin_sweep_mm / 1000.0,
        fin_leading_edge_x_m=request.fin_leading_edge_x_mm / 1000.0,
        launch_angle_deg=request.launch_angle_deg,
        cd=request.cd,
        motor=Motor(
            request.motor_burn_time_s,
            request.motor_total_impulse_n_s,
            request.motor_propellant_mass_g / 1000.0,
            request.motor_dry_mass_g / 1000.0,
        ),
    )
    return FullAnalysisResponse(
        total_mass_g=result.total_mass_kg * 1000.0,
        cg_x_mm_from_nose=result.cg_x_m * 1000.0,
        cp_x_mm_from_nose=result.cp_x_m * 1000.0,
        static_margin_calibers=result.static_margin_calibers,
        apogee_m=result.apogee_m,
        time_to_apogee_s=result.time_to_apogee_s,
        max_q_pa=result.max_q_pa,
        max_speed_m_s=result.max_speed_m_s,
        max_mach=result.max_mach,
    )
