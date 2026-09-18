from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="TRAJECTUM API", version="0.1.0-dev0")


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class Capability(BaseModel):
    name: str
    state: str


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="trajectum-api", version="0.1.0-dev0")


@app.get("/v1/capabilities", response_model=list[Capability])
def capabilities() -> list[Capability]:
    return [
        Capability(name="projects", state="planned"),
        Capability(name="vehicles", state="planned"),
        Capability(name="simulations", state="planned"),
        Capability(name="jobs", state="planned"),
        Capability(name="results", state="planned"),
        Capability(name="validation", state="planned"),
    ]
