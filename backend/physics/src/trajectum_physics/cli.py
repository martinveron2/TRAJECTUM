from __future__ import annotations

import argparse
import json
from pathlib import Path

from .cdr import run_cdr_case


def _result_payload(path: Path) -> dict[str, object]:
    result = run_cdr_case(path)
    return {
        "vehicle_id": result.vehicle_id,
        "ready_for_numeric_cdr": result.ready_for_numeric_cdr,
        "blockers": list(result.blockers),
        "cg": None
        if result.cg is None
        else {
            "total_mass_kg": result.cg.total_mass_kg,
            "x_m": result.cg.cg_x_m,
        },
        "cp_x_m": result.cp_x_m,
        "static_margin_calibers": None
        if result.stability is None
        else result.stability.calibers,
        "trajectory": None
        if result.trajectory is None
        else {
            "apogee_m": result.trajectory.apogee_m,
            "time_to_apogee_s": result.trajectory.time_to_apogee_s,
            "max_q_pa": result.trajectory.max_q_pa,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the TRAJECTUM CDR engineering pipeline.")
    parser.add_argument("case", type=Path, help="Path to a vehicle CDR JSON case.")
    parser.add_argument("--json", action="store_true", dest="as_json")
    args = parser.parse_args()

    payload = _result_payload(args.case)
    if args.as_json:
        print(json.dumps(payload, indent=2))
    else:
        print(f"Vehicle: {payload['vehicle_id']}")
        print(f"Numeric CDR ready: {payload['ready_for_numeric_cdr']}")
        blockers = payload["blockers"]
        if blockers:
            print("Blockers:")
            for blocker in blockers:
                print(f"  - {blocker}")
        else:
            print(f"CG: {payload['cg']}")
            print(f"CP x: {payload['cp_x_m']} m")
            print(f"Static margin: {payload['static_margin_calibers']} calibers")
            print(f"Trajectory: {payload['trajectory']}")

    return 0 if payload["ready_for_numeric_cdr"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
