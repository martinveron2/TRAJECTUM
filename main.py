from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent
for package_src in (
    ROOT / "backend" / "api" / "src",
    ROOT / "backend" / "physics" / "src",
    ROOT / "backend" / "cad" / "src",
    ROOT / "backend" / "core" / "src",
):
    sys.path.insert(0, str(package_src))

from trajectum_api.main import app as trajectum_api  # noqa: E402

app = FastAPI(title="TRAJECTUM", docs_url=None, redoc_url=None)
app.mount("/api", trajectum_api)

frontend_dist = ROOT / "frontend" / "web" / "dist"
app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
