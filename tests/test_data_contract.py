import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_engineering_record_schema_is_machine_readable():
    schema = json.loads(
        (ROOT / "data" / "schemas" / "engineering-record.schema.json").read_text()
    )
    required = set(schema["required"])
    assert {"status", "source", "assumptions", "validity", "revision"} <= required
    assert "pending" in schema["properties"]["status"]["enum"]


def test_catalog_paths_exist():
    for category in ("motors", "materials", "atmosphere", "vehicles", "flights", "experiments"):
        assert (ROOT / "data" / category).is_dir()
