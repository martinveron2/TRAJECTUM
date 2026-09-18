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
