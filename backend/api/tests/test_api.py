from fastapi.testclient import TestClient

from trajectum_api.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_current_digital_twin_exposes_verified_cad_and_measured_masses():
    response = client.get("/v1/digital-twin/current")
    assert response.status_code == 200
    data = response.json()
    assert data["geometry"]["outer_diameter_mm"]["value"] == 63.0
    assert data["geometry"]["nose_length_mm"]["value"] == 180.0
    assert data["geometry"]["total_length_mm"]["value"] == 789.0
    masses = data["masses"]
    assert masses["measured_structure_total_g"] == 870.0
    assert sum(item["mass_g"] for item in masses["measured_items"]) == 870.0
    assert data["fins"]["airfoil"]["designation"]["value"] == "NACA 0012"
    assert data["fins"]["root_chord_mm"]["value"] == 97.67
    assert data["fins"]["tip_chord_mm"]["value"] == 39.96
    assert data["fins"]["span_mm"]["value"] == 52.5
    assert data["fins"]["sweep_length_mm"]["value"] == 42.0
    assert data["fins"]["leading_edge_x_mm"]["value"] == 689.0
    assert data["legacy_test_vehicle"]["status"] == "simulation-fixture-only-not-current-design"


def test_current_digital_twin_cp_uses_current_fusion_geometry_without_mass_inputs():
    response = client.get("/v1/digital-twin/cp")
    assert response.status_code == 200
    data = response.json()
    assert data["resolved"] is True
    assert data["status"] == "derived-current-geometry"
    assert data["blockers"] == []
    assert abs(data["cp_x_mm_from_nose"] - 578.2305610742484) < 1e-9
    assert abs(data["cp_x_mm_from_support"] - 210.76943892575156) < 1e-9
    assert [item["name"] for item in data["contributions"]] == ["nose", "fins"]


def test_current_digital_twin_assembly_uses_drawing_derived_engagements():
    response = client.get("/v1/digital-twin/assembly")
    assert response.status_code == 200
    data = response.json()
    assert data["datum"] == "nose_tip_x0_positive_aft"
    assert data["resolved"] is True
    assert abs(data["total_length_mm"] - 789.0) < 1e-9
    assert data["blockers"] == []
    stations = {item["key"]: item for item in data["stations"]}
    assert stations["nose"]["x_start_mm"] == 0.0
    assert stations["nose"]["x_end_mm"] == 180.0
    assert abs(stations["c1_parachute_payload"]["x_start_mm"] - 165.0) < 1e-9
    assert abs(stations["c1_parachute_payload"]["x_end_mm"] - 380.0) < 1e-9
    assert abs(stations["c2"]["x_start_mm"] - 365.0) < 1e-9
    assert abs(stations["c2"]["x_end_mm"] - 580.0) < 1e-9
    assert abs(stations["tail_fin_can"]["x_start_mm"] - 564.0) < 1e-9
    assert abs(stations["tail_fin_can"]["x_end_mm"] - 789.0) < 1e-9
    assert data["internal_parts"][0]["key"] == "motor_mount"


def test_capabilities_are_explicit_contracts():
    response = client.get("/v1/capabilities")
    assert response.status_code == 200
    names = {item["name"] for item in response.json()}
    assert {"vehicles", "simulations", "results", "validation"} <= names


def test_cg_cp_analysis_endpoint():
    response = client.post(
        "/v1/analysis/cg-cp",
        json={
            "nose_length_mm": 180,
            "body_diameter_mm": 63,
            "fin_count": 4,
            "fin_root_chord_mm": 80,
            "fin_tip_chord_mm": 40,
            "fin_span_mm": 50,
            "fin_sweep_mm": 20,
            "fin_leading_edge_x_mm": 760,
            "masses": [
                {"name": "motor", "mass_g": 490, "x_cg_mm": 760},
                {"name": "airframe", "mass_g": 580, "x_cg_mm": 420},
            ],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert abs(data["total_mass_g"] - 1070) < 1e-6
    assert data["cg_x_mm_from_nose"] > 0
    assert data["cp_x_mm_from_nose"] > 0


def test_cg_only_endpoint():
    response = client.post(
        "/v1/analysis/cg",
        json={
            "masses": [
                {"name": "nose", "mass_g": 100, "x_cg_mm": 111.4},
                {"name": "body", "mass_g": 330, "x_cg_mm": 520},
                {"name": "parachute", "mass_g": 30, "x_cg_mm": 200},
                {"name": "payload", "mass_g": 100, "x_cg_mm": 225},
                {"name": "motor", "mass_g": 490, "x_cg_mm": 765},
                {"name": "fins-demo", "mass_g": 80, "x_cg_mm": 800},
            ]
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert abs(data["total_mass_g"] - 1130) < 1e-6
    assert 570 < data["cg_x_mm_from_nose"] < 580


def test_full_analysis_endpoint():
    response = client.post(
        "/v1/analysis/full",
        json={
            "nose_length_mm": 180,
            "body_diameter_mm": 63,
            "fin_count": 4,
            "fin_root_chord_mm": 80,
            "fin_tip_chord_mm": 40,
            "fin_span_mm": 50,
            "fin_sweep_mm": 20,
            "fin_leading_edge_x_mm": 760,
            "launch_angle_deg": 85,
            "cd": 0.55,
            "masses": [
                {"name": "nose", "mass_g": 100, "x_cg_mm": 111.4},
                {"name": "fins", "mass_g": 20, "x_cg_mm": 822.2},
                {"name": "body", "mass_g": 330, "x_cg_mm": 520},
                {"name": "motor", "mass_g": 490, "x_cg_mm": 765},
                {"name": "parachute", "mass_g": 30, "x_cg_mm": 200},
                {"name": "payload", "mass_g": 100, "x_cg_mm": 225},
            ],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert abs(data["total_mass_g"] - 1070) < 1e-6
    assert data["apogee_m"] > 0
    assert data["max_q_pa"] > 0
    assert data["max_mach"] > 0
    assert data["deployment_time_s"] is not None
    assert data["deployment_altitude_m"] is not None
    assert data["landing_time_s"] > data["time_to_apogee_s"]
    assert data["impact_speed_m_s"] > 0
    assert len(data["mission_timeline"]) > 10
    assert data["mission_timeline"][0]["phase"] == "BOOST"
    assert data["mission_timeline"][-1]["phase"] == "LANDED"


def test_cad_formats_endpoint():
    response = client.get("/v1/cad/formats")
    assert response.status_code == 200
    names = {item["name"] for item in response.json()}
    assert {"STEP", "Fusion 360", "Inventor", "STL"} <= names


def test_component_geometry_endpoint_derives_component_and_total_cg():
    response = client.post(
        "/v1/components/cg",
        json=[
            {"name": "nose", "kind": "tangent_ogive_shell", "mass_g": 100, "length_mm": 180, "base_radius_mm": 31.5},
            {"name": "body", "kind": "axial_uniform", "mass_g": 330, "x_start_mm": 180, "x_end_mm": 860},
            {"name": "motor", "kind": "axial_uniform", "mass_g": 490, "x_start_mm": 670, "x_end_mm": 860},
            {"name": "payload", "kind": "axial_uniform", "mass_g": 100, "x_start_mm": 180, "x_end_mm": 270},
        ],
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["components"]) == 4
    assert data["total_mass_g"] == 1020
    assert all(item["x_cg_mm"] > 0 for item in data["components"])



def test_unified_full_analysis_derives_components_and_support_reference():
    response = client.post(
        "/v2/analysis/full",
        json={
            "total_length_mm": 860,
            "body_diameter_mm": 63,
            "nose_length_mm": 180,
            "nose_profile": "tangent_ogive",
            "fin_count": 4,
            "fin_root_chord_mm": 80,
            "fin_tip_chord_mm": 40,
            "fin_span_mm": 50,
            "fin_sweep_mm": 20,
            "fin_leading_edge_x_mm": 760,
            "launch_angle_deg": 85,
            "cd": 0.55,
            "motor_official_average_thrust_n": 441,
            "motor_thrust_curve": [
                {"time_s": 0.00, "thrust_n": 0},
                {"time_s": 0.05, "thrust_n": 600},
                {"time_s": 0.10, "thrust_n": 550},
                {"time_s": 0.20, "thrust_n": 530},
                {"time_s": 0.30, "thrust_n": 500},
                {"time_s": 0.40, "thrust_n": 400},
                {"time_s": 0.45, "thrust_n": 50},
                {"time_s": 0.50, "thrust_n": 0},
            ],
            "components": [
                {"name": "Cofia", "kind": "profile_shell", "mass_g": 100, "length_mm": 180, "base_radius_mm": 31.5, "profile": "tangent_ogive"},
                {"name": "Cuerpo principal", "kind": "axial_uniform", "mass_g": 330, "x_start_mm": 180, "x_end_mm": 860},
                {"name": "Motor", "kind": "axial_uniform", "mass_g": 490, "x_start_mm": 670, "x_end_mm": 860},
                {"name": "Paracaídas", "kind": "axial_uniform", "mass_g": 30, "x_start_mm": 180, "x_end_mm": 240},
                {"name": "Electrónica", "kind": "axial_uniform", "mass_g": 80, "x_start_mm": 240, "x_end_mm": 300},
                {"name": "Carga útil", "kind": "axial_uniform", "mass_g": 100, "x_start_mm": 300, "x_end_mm": 360},
                {"name": "Aletas · 4 total", "kind": "trapezoidal_fin_set", "mass_g": 20, "leading_edge_x_mm": 760, "root_chord_mm": 80, "tip_chord_mm": 40, "span_mm": 50, "sweep_mm": 20},
            ],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["components"]) == 7
    assert abs(data["total_mass_g"] - 1150.0) < 1e-6
    assert abs(data["cg_x_mm_from_support"] - (860.0 - data["cg_x_mm_from_nose"])) < 1e-6
    assert abs(data["cp_x_mm_from_support"] - (860.0 - data["cp_x_mm_from_nose"])) < 1e-6
    assert all(item["x_cg_mm_from_support"] >= 0 for item in data["components"])
    assert data["apogee_m"] > 0
    assert data["mission_timeline"][-1]["phase"] == "LANDED"
