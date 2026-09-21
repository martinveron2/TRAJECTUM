from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from trajectum_cad import CAD_FORMATS, nose_profile
from trajectum_physics import (
    AxialInterface,
    AxialPart,
    ComponentMassProperty,
    MassPoint,
    Motor,
    analyze_vehicle,
    assemble_axially,
    axial_uniform_cg,
    axisymmetric_nose_cp_from_profile,
    axisymmetric_shell_cg_from_profile,
    center_of_gravity,
    combine_component_mass_properties,
    combine_cp,
    static_margin,
    tangent_ogive_cp,
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
    x_cg_mm: float | None = None
    length_mm: float | None = None
    base_radius_mm: float | None = None
    leading_edge_x_mm: float | None = None
    root_chord_mm: float | None = None
    tip_chord_mm: float | None = None
    span_mm: float | None = None
    sweep_mm: float | None = None
    profile: str | None = None
    power_exponent: float = 0.75


class ComponentCGOut(BaseModel):
    name: str
    mass_g: float
    x_cg_mm: float
    source: str


class ComponentCGResponse(BaseModel):
    components: list[ComponentCGOut]
    total_mass_g: float
    total_cg_mm: float


class ComponentReferenceOut(BaseModel):
    name: str
    mass_g: float
    x_cg_mm_from_nose: float
    x_cg_mm_from_support: float
    source: str


class CGRequest(BaseModel):
    masses: list[MassItemIn]


class CGResponse(BaseModel):
    total_mass_g: float
    cg_x_mm_from_nose: float


class AnalysisRequest(BaseModel):
    total_length_mm: float = Field(default=860.0, gt=0)
    nose_length_mm: float = Field(gt=0)
    body_diameter_mm: float = Field(gt=0)
    fin_count: int = Field(ge=3)
    fin_root_chord_mm: float = Field(gt=0)
    fin_tip_chord_mm: float = Field(gt=0)
    fin_span_mm: float = Field(gt=0)
    fin_sweep_mm: float = Field(ge=0)
    fin_leading_edge_x_mm: float = Field(ge=0)
    masses: list[MassItemIn]
    nose_profile: str = "tangent_ogive"
    nose_power_exponent: float = 0.75


class ThrustPointIn(BaseModel):
    time_s: float = Field(ge=0)
    thrust_n: float = Field(ge=0)


class FullAnalysisRequest(AnalysisRequest):
    launch_angle_deg: float = Field(gt=0, le=90)
    cd: float = Field(gt=0)
    motor_burn_time_s: float = Field(default=0.5, gt=0)
    motor_total_impulse_n_s: float = Field(default=207.0, gt=0)
    motor_propellant_mass_g: float = Field(default=140.0, gt=0)
    motor_dry_mass_g: float = Field(default=350.0, gt=0)
    motor_official_average_thrust_n: float | None = Field(default=None, gt=0)
    motor_thrust_curve: list[ThrustPointIn] | None = None
    parachute_cd: float = Field(default=1.5, gt=0)
    parachute_area_m2: float = Field(default=0.20, gt=0)
    deploy_altitude_m: float | None = Field(default=None, gt=0)
    deploy_delay_s: float = Field(default=0.0, ge=0)

class AnalysisResponse(BaseModel):
    total_mass_g: float
    cg_x_mm_from_nose: float
    cp_x_mm_from_nose: float
    static_margin_calibers: float
    nose_cp_x_mm: float
    fins_cp_x_mm: float




class MissionSampleOut(BaseModel):
    t_s: float
    phase: str
    x_m: float
    altitude_m: float
    speed_m_s: float
    vertical_speed_m_s: float
    mach: float
    q_pa: float
    acceleration_g: float
    parachute_deployed: bool




class UnifiedFullAnalysisRequest(BaseModel):
    total_length_mm: float = Field(gt=0)
    body_diameter_mm: float = Field(gt=0)
    nose_length_mm: float = Field(gt=0)
    nose_profile: str = "tangent_ogive"
    nose_power_exponent: float = 0.75
    fin_count: int = Field(ge=3)
    fin_root_chord_mm: float = Field(gt=0)
    fin_tip_chord_mm: float = Field(gt=0)
    fin_span_mm: float = Field(gt=0)
    fin_sweep_mm: float = Field(ge=0)
    fin_leading_edge_x_mm: float = Field(ge=0)
    components: list[ComponentGeometryIn]
    launch_angle_deg: float = Field(gt=0, le=90)
    cd: float = Field(gt=0)
    motor_burn_time_s: float = Field(default=0.5, gt=0)
    motor_total_impulse_n_s: float = Field(default=207.0, gt=0)
    motor_propellant_mass_g: float = Field(default=140.0, gt=0)
    motor_dry_mass_g: float = Field(default=350.0, gt=0)
    motor_official_average_thrust_n: float | None = Field(default=None, gt=0)
    motor_thrust_curve: list[ThrustPointIn] | None = None
    parachute_cd: float = Field(default=1.5, gt=0)
    parachute_area_m2: float = Field(default=0.20, gt=0)
    deploy_altitude_m: float | None = Field(default=None, gt=0)
    deploy_delay_s: float = Field(default=0.0, ge=0)


class UnifiedFullAnalysisResponse(BaseModel):
    total_mass_g: float
    components: list[ComponentReferenceOut]
    cg_x_mm_from_nose: float
    cg_x_mm_from_support: float
    cp_x_mm_from_nose: float
    cp_x_mm_from_support: float
    nose_cp_x_mm_from_nose: float
    nose_cp_x_mm_from_support: float
    fins_cp_x_mm_from_nose: float
    fins_cp_x_mm_from_support: float
    static_margin_calibers: float
    apogee_m: float
    time_to_apogee_s: float
    max_q_pa: float
    max_speed_m_s: float
    max_mach: float
    deployment_time_s: float | None
    deployment_altitude_m: float | None
    landing_time_s: float
    impact_speed_m_s: float
    mission_timeline: list[MissionSampleOut]



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
    deployment_time_s: float | None
    deployment_altitude_m: float | None
    landing_time_s: float
    impact_speed_m_s: float
    mission_timeline: list[MissionSampleOut]


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="trajectum-api", version="0.2.0-dev0")


CURRENT_DESIGN_PATH = Path(__file__).resolve().parents[4] / "data" / "reference-cases" / "utn-frh-g07" / "vehicle.cdr.json"
CURRENT_DESIGN_REVISION = "2026-09-20-fusion-geometry-cg-estimated"


def _load_current_design() -> dict[str, Any]:
    return json.loads(CURRENT_DESIGN_PATH.read_text(encoding="utf-8"))


@app.get("/v1/digital-twin/current")
def current_digital_twin() -> dict[str, Any]:
    """Return the current-design engineering baseline with verification/TBD markers intact."""
    payload = _load_current_design()
    payload["api_baseline_revision"] = CURRENT_DESIGN_REVISION
    return payload


@app.get("/v1/digital-twin/assembly")
def current_digital_twin_assembly() -> dict[str, Any]:
    design = _load_current_design()
    geometry = design["geometry"]
    part_data = geometry["parts"]
    assembly_data = geometry["assembly"]

    parts = []
    for key in assembly_data["serial_airframe_sequence"]:
        item = part_data[key]
        length_mm = item.get("raw_part_length_mm", item.get("length_mm"))
        parts.append(AxialPart(key=key, name=key, raw_length_m=float(length_mm) / 1000.0))

    interfaces = []
    for item in assembly_data["interfaces"]:
        value = item["overlap_mm"]["value"]
        interfaces.append(
            AxialInterface(
                upstream_key=item["upstream"],
                downstream_key=item["downstream"],
                overlap_m=None if value is None else float(value) / 1000.0,
            )
        )

    result = assemble_axially(tuple(parts), tuple(interfaces))
    return {
        "api_baseline_revision": CURRENT_DESIGN_REVISION,
        "datum": assembly_data["datum"],
        "resolved": result.resolved,
        "total_length_mm": None if result.total_length_m is None else result.total_length_m * 1000.0,
        "blockers": list(result.blockers),
        "stations": [
            {
                "key": station.key,
                "name": station.name,
                "x_start_mm": None if station.x_start_m is None else station.x_start_m * 1000.0,
                "x_end_mm": None if station.x_end_m is None else station.x_end_m * 1000.0,
                "raw_length_mm": station.raw_length_m * 1000.0,
            }
            for station in result.stations
        ],
        "interfaces": assembly_data["interfaces"],
        "internal_parts": assembly_data["internal_parts"],
    }


@app.get("/v1/digital-twin/cp")
def current_digital_twin_cp() -> dict[str, Any]:
    design = _load_current_design()
    geometry = design["geometry"]
    fins = design["fins"]

    required = {
        "geometry.outer_diameter_mm": geometry["outer_diameter_mm"]["value"],
        "geometry.nose_length_mm": geometry["nose_length_mm"]["value"],
        "geometry.total_length_mm": geometry["total_length_mm"]["value"],
        "fins.count": fins["count"]["value"],
        "fins.root_chord_mm": fins["root_chord_mm"]["value"],
        "fins.tip_chord_mm": fins["tip_chord_mm"]["value"],
        "fins.span_mm": fins["span_mm"]["value"],
        "fins.sweep_length_mm": fins["sweep_length_mm"]["value"],
        "fins.leading_edge_x_mm": fins["leading_edge_x_mm"]["value"],
    }
    blockers = [path for path, value in required.items() if value is None]
    if blockers:
        return {
            "api_baseline_revision": CURRENT_DESIGN_REVISION,
            "resolved": False,
            "method": "Barrowman-style tangent-ogive + trapezoidal-fin set",
            "blockers": blockers,
        }

    nose = tangent_ogive_cp(float(required["geometry.nose_length_mm"]) / 1000.0)
    fin_set = trapezoidal_fin_set_cp(
        count=int(required["fins.count"]),
        body_diameter_m=float(required["geometry.outer_diameter_mm"]) / 1000.0,
        root_chord_m=float(required["fins.root_chord_mm"]) / 1000.0,
        tip_chord_m=float(required["fins.tip_chord_mm"]) / 1000.0,
        span_m=float(required["fins.span_mm"]) / 1000.0,
        sweep_length_m=float(required["fins.sweep_length_mm"]) / 1000.0,
        leading_edge_x_m=float(required["fins.leading_edge_x_mm"]) / 1000.0,
    )
    result = combine_cp(nose, fin_set)
    total_length_mm = float(required["geometry.total_length_mm"])
    cp_from_nose_mm = result.x_cp_m * 1000.0
    return {
        "api_baseline_revision": CURRENT_DESIGN_REVISION,
        "resolved": True,
        "method": "Barrowman-style tangent-ogive + trapezoidal-fin set",
        "status": "derived-current-geometry",
        "datum": "nose_tip_x0_positive_aft",
        "cp_x_mm_from_nose": cp_from_nose_mm,
        "cp_x_mm_from_support": total_length_mm - cp_from_nose_mm,
        "cn_alpha_total": result.cn_alpha_total,
        "contributions": [
            {
                "name": item.name,
                "cn_alpha": item.cn_alpha,
                "x_cp_mm_from_nose": item.x_cp_m * 1000.0,
            }
            for item in result.contributions
        ],
        "notes": [
            "CP is independent of the unresolved mass distribution.",
            "Fin sweep is currently drawing-derived from the 1:1 Fusion view.",
            "Static margin remains blocked until the vehicle CG is resolved.",
        ],
        "blockers": [],
    }


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




def _calculate_component_mass_properties(request: list[ComponentGeometryIn]) -> list[ComponentMassProperty]:
    calculated: list[ComponentMassProperty] = []
    for item in request:
        if item.kind == "axial_uniform":
            if item.x_start_mm is None or item.x_end_mm is None:
                raise ValueError("axial_uniform requires x_start_mm and x_end_mm")
            x = axial_uniform_cg(x_start_m=item.x_start_mm / 1000.0, x_end_m=item.x_end_mm / 1000.0)
            source = "geometry:axial_uniform"
        elif item.kind == "point_mass":
            if item.x_cg_mm is None:
                raise ValueError("point_mass requires x_cg_mm")
            x = item.x_cg_mm / 1000.0
            source = "estimate:drawing-derived-station"
        elif item.kind in {"tangent_ogive_shell", "profile_shell"}:
            if item.length_mm is None or item.base_radius_mm is None:
                raise ValueError("nose shell requires length_mm and base_radius_mm")
            profile_name = item.profile or "tangent_ogive"
            stations_mm = nose_profile(
                profile_name,
                length_mm=item.length_mm,
                base_radius_mm=item.base_radius_mm,
                stations=401,
                power_exponent=item.power_exponent,
            )
            stations_m = tuple((px / 1000.0, pr / 1000.0) for px, pr in stations_mm)
            x = axisymmetric_shell_cg_from_profile(stations_m)
            source = f"geometry:{profile_name}_shell"
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
    return calculated


@app.post("/v1/components/cg", response_model=ComponentCGResponse)
def component_cg(request: list[ComponentGeometryIn]) -> ComponentCGResponse:
    calculated = _calculate_component_mass_properties(request)
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
    nose_stations_mm = nose_profile(
        request.nose_profile,
        length_mm=request.nose_length_mm,
        base_radius_mm=request.body_diameter_mm / 2.0,
        stations=401,
        power_exponent=request.nose_power_exponent,
    )
    nose_stations_m = tuple((x / 1000.0, r / 1000.0) for x, r in nose_stations_mm)
    nose = axisymmetric_nose_cp_from_profile(
        nose_stations_m,
        base_radius_m=request.body_diameter_mm / 2000.0,
    )
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
    nose_stations_mm = nose_profile(
        request.nose_profile,
        length_mm=request.nose_length_mm,
        base_radius_mm=request.body_diameter_mm / 2.0,
        stations=401,
        power_exponent=request.nose_power_exponent,
    )
    nose_stations_m = tuple((x / 1000.0, r / 1000.0) for x, r in nose_stations_mm)
    nose_contribution = axisymmetric_nose_cp_from_profile(
        nose_stations_m,
        base_radius_m=request.body_diameter_mm / 2000.0,
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
            tuple((point.time_s, point.thrust_n) for point in request.motor_thrust_curve or ()),
            request.motor_official_average_thrust_n,
        ),
        parachute_cd=request.parachute_cd,
        parachute_area_m2=request.parachute_area_m2,
        deploy_altitude_m=request.deploy_altitude_m,
        deploy_delay_s=request.deploy_delay_s,
        nose_cp_contribution=nose_contribution,
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
        deployment_time_s=result.deployment_time_s,
        deployment_altitude_m=result.deployment_altitude_m,
        landing_time_s=result.landing_time_s,
        impact_speed_m_s=result.impact_speed_m_s,
        mission_timeline=[
            MissionSampleOut(
                t_s=sample.t_s,
                phase=sample.phase,
                x_m=sample.x_m,
                altitude_m=sample.altitude_m,
                speed_m_s=sample.speed_m_s,
                vertical_speed_m_s=sample.vertical_speed_m_s,
                mach=sample.mach,
                q_pa=sample.q_pa,
                acceleration_g=sample.acceleration_g,
                parachute_deployed=sample.parachute_deployed,
            )
            for sample in result.mission_timeline
        ],
    )


@app.post("/v2/analysis/full", response_model=UnifiedFullAnalysisResponse)
def analyze_full_v2(request: UnifiedFullAnalysisRequest) -> UnifiedFullAnalysisResponse:
    calculated = _calculate_component_mass_properties(request.components)
    total = combine_component_mass_properties(tuple(calculated))
    masses = tuple(
        MassPoint(name=item.name, mass_kg=item.mass_kg, x_m=item.x_cg_m)
        for item in calculated
    )

    nose_stations_mm = nose_profile(
        request.nose_profile,
        length_mm=request.nose_length_mm,
        base_radius_mm=request.body_diameter_mm / 2.0,
        stations=401,
        power_exponent=request.nose_power_exponent,
    )
    nose_stations_m = tuple((x / 1000.0, r / 1000.0) for x, r in nose_stations_mm)
    nose = axisymmetric_nose_cp_from_profile(
        nose_stations_m,
        base_radius_m=request.body_diameter_mm / 2000.0,
    )
    fins = trapezoidal_fin_set_cp(
        count=request.fin_count,
        body_diameter_m=request.body_diameter_mm / 1000.0,
        span_m=request.fin_span_mm / 1000.0,
        root_chord_m=request.fin_root_chord_mm / 1000.0,
        tip_chord_m=request.fin_tip_chord_mm / 1000.0,
        sweep_length_m=request.fin_sweep_mm / 1000.0,
        leading_edge_x_m=request.fin_leading_edge_x_mm / 1000.0,
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
            tuple((point.time_s, point.thrust_n) for point in request.motor_thrust_curve or ()),
            request.motor_official_average_thrust_n,
        ),
        parachute_cd=request.parachute_cd,
        parachute_area_m2=request.parachute_area_m2,
        deploy_altitude_m=request.deploy_altitude_m,
        deploy_delay_s=request.deploy_delay_s,
        nose_cp_contribution=nose,
    )

    length = request.total_length_mm
    components = [
        ComponentReferenceOut(
            name=item.name,
            mass_g=item.mass_kg * 1000.0,
            x_cg_mm_from_nose=item.x_cg_m * 1000.0,
            x_cg_mm_from_support=length - item.x_cg_m * 1000.0,
            source=item.source,
        )
        for item in calculated
    ]
    cp_x = result.cp_x_m * 1000.0
    nose_cp_x = nose.x_cp_m * 1000.0
    fins_cp_x = fins.x_cp_m * 1000.0
    return UnifiedFullAnalysisResponse(
        total_mass_g=total.total_mass_kg * 1000.0,
        components=components,
        cg_x_mm_from_nose=result.cg_x_m * 1000.0,
        cg_x_mm_from_support=length - result.cg_x_m * 1000.0,
        cp_x_mm_from_nose=cp_x,
        cp_x_mm_from_support=length - cp_x,
        nose_cp_x_mm_from_nose=nose_cp_x,
        nose_cp_x_mm_from_support=length - nose_cp_x,
        fins_cp_x_mm_from_nose=fins_cp_x,
        fins_cp_x_mm_from_support=length - fins_cp_x,
        static_margin_calibers=result.static_margin_calibers,
        apogee_m=result.apogee_m,
        time_to_apogee_s=result.time_to_apogee_s,
        max_q_pa=result.max_q_pa,
        max_speed_m_s=result.max_speed_m_s,
        max_mach=result.max_mach,
        deployment_time_s=result.deployment_time_s,
        deployment_altitude_m=result.deployment_altitude_m,
        landing_time_s=result.landing_time_s,
        impact_speed_m_s=result.impact_speed_m_s,
        mission_timeline=[
            MissionSampleOut(
                t_s=sample.t_s,
                phase=sample.phase,
                x_m=sample.x_m,
                altitude_m=sample.altitude_m,
                speed_m_s=sample.speed_m_s,
                vertical_speed_m_s=sample.vertical_speed_m_s,
                mach=sample.mach,
                q_pa=sample.q_pa,
                acceleration_g=sample.acceleration_g,
                parachute_deployed=sample.parachute_deployed,
            )
            for sample in result.mission_timeline
        ],
    )
