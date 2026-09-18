from fastapi.testclient import TestClient

from trajectum_api.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


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
