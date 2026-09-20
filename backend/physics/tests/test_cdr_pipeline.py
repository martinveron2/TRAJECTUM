import json
from pathlib import Path

from trajectum_physics import run_cdr_case


def _baseline_path() -> Path:
    return Path(__file__).parents[3] / "data" / "reference-cases" / "utn-frh-g07" / "vehicle.cdr.json"


def test_current_cad_baseline_keeps_measured_structure_mass_without_inventing_cg_stations():
    payload = json.loads(_baseline_path().read_text(encoding="utf-8"))
    masses = payload["masses"]
    assert masses["measured_structure_total_g"] == 870.0
    assert sum(item["mass_g"] for item in masses["measured_items"]) == 870.0
    assert "items" not in masses


def test_real_reference_case_fails_closed_on_known_tbd_inputs():
    result = run_cdr_case(_baseline_path())
    assert result.vehicle_id == "utn-frh-g07-cdr"
    assert not result.ready_for_numeric_cdr
    assert result.blockers == ("masses.items", "aerodynamics.cd")
    assert result.cg is None
    assert result.cp_x_m is not None
    assert result.trajectory is None


def test_complete_case_runs_end_to_end(tmp_path):
    payload = json.loads(_baseline_path().read_text(encoding="utf-8"))
    payload["fins"]["root_chord_mm"] = {"value": 80.0, "status": "test-fixture"}
    payload["fins"]["tip_chord_mm"] = {"value": 40.0, "status": "test-fixture"}
    payload["fins"]["span_mm"] = {"value": 50.0, "status": "test-fixture"}
    payload["fins"]["sweep_length_mm"] = {"value": 20.0, "status": "test-fixture"}
    payload["fins"]["leading_edge_x_mm"] = {"value": 760.0, "status": "test-fixture"}
    payload["aerodynamics"]["cd"] = {"value": 0.55, "status": "test-fixture"}
    payload["masses"] = {
        "status": "test-fixture",
        "items": [
            {"name": "motor", "mass_g": 490.0, "x_cg_mm": 760.0},
            {"name": "airframe", "mass_g": 580.0, "x_cg_mm": 420.0},
        ],
    }
    path = tmp_path / "complete.json"
    path.write_text(json.dumps(payload), encoding="utf-8")

    result = run_cdr_case(path)
    assert result.ready_for_numeric_cdr
    assert result.cg is not None
    assert result.cp_x_m is not None
    assert result.stability is not None
    assert result.trajectory is not None
    assert result.trajectory.apogee_m > 0
    assert result.trajectory.max_q_pa > 0
