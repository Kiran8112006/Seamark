# ============================================================
# SEAMARK — Backend Simulation & Detection Engine (FastAPI)
# SIH 2026 Problem Statement: 26064
# ============================================================
import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    env_candidate = Path(__file__).resolve().parent / ".env"
    if env_candidate.exists():
        load_dotenv(dotenv_path=env_candidate)
    else:
        load_dotenv()
except ImportError:
    pass

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.router import api_router
from core.simulation import simulation_engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: simulation engine ready with pre-populated deterministic state
    yield
    # Shutdown: cleanly cancel background simulation runner if active
    if simulation_engine._loop_task and not simulation_engine._loop_task.done():
        simulation_engine._loop_task.cancel()

app = FastAPI(
    title="SEAMARK API — Seafloor Metal Detection & Exploration Engine",
    description=(
        "Backend simulation, synchronous EM demodulation, multi-physics anomaly detection, "
        "and adaptive resurvey engine for SIH 2026 Problem Statement 26064.\n\n"
        "**DATA SOURCE: SIMULATION / PROTOTYPE DATA**\n"
        "All measurements are synthetic prototype models for system validation."
    ),
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for Next.js frontend
cors_env = os.environ.get("CORS_ORIGINS", "")
if cors_env:
    origins = [o.strip() for o in cors_env.split(",") if o.strip()]
else:
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router, prefix="/api")

@app.get("/")
async def root():
    return {
        "system": "SEAMARK",
        "description": "Deployable Seafloor Metal Detection Sensor Simulation Engine",
        "sihProblemStatement": "26064",
        "status": "OPERATIONAL",
        "dataSource": "SIMULATION / PROTOTYPE DATA",
        "apiDocs": "/docs",
        "endpoints": {
            "systemStatus": "/api/system/status",
            "surveyStatus": "/api/survey/current",
            "telemetry": "/api/telemetry",
            "nodes": "/api/nodes",
            "detection": "/api/detection/latest",
            "targets": "/api/targets",
            "map": "/api/map",
            "resurvey": "/api/resurvey/state",
            "validation": "/api/validation",
            "exportCsv": "/api/export/csv",
            "exportJson": "/api/export/json",
            "security": "/api/security/status"
        }
    }

if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("SEAMARK_HOST", "127.0.0.1")
    port = int(os.environ.get("SEAMARK_PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=False)
