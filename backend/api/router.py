# ============================================================
# SEAMARK — Unified API Router
# Supports standard /api routes and /api/v1 aliases for clean frontend integration
# ============================================================
import io
import csv
from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from core.simulation import simulation_engine
from core.security import security_engine
from config import SystemConfiguration
from models.schemas import (
    SystemStatus,
    SurveyStatus,
    DetectionStatus,
    TelemetryPoint,
    SurveyMeasurement,
    NodeStatus,
    DetectionResult,
    Target,
    MapCell,
    ResurveyState,
    ValidationResult,
    SecurityEvent,
    SecurityStatus
)

api_router = APIRouter()

# Request body schemas
class ResurveyRequest(BaseModel):
    target_id: Optional[str] = None
    targetId: Optional[str] = None

class SpeedRequest(BaseModel):
    speed: float

class SecuritySimRequest(BaseModel):
    anomaly_type: str = "REPLAY" # REPLAY, GAP, UNKNOWN_NODE, DEGRADED, VERIFY
    node_id: str = "SN-02"

# --- 1. System Status ---
@api_router.get("/system/status", response_model=SystemStatus)
@api_router.get("/v1/system/status", response_model=SystemStatus)
async def get_system_status():
    return simulation_engine.get_system_status()

# --- 2. Survey Status & Controls ---
@api_router.get("/survey/current", response_model=SurveyStatus)
@api_router.get("/v1/survey/status", response_model=SurveyStatus)
async def get_survey_status(step: Optional[int] = None):
    return simulation_engine.get_survey_status()

@api_router.post("/survey/start")
@api_router.post("/v1/survey/start")
async def start_survey():
    await simulation_engine.start()
    return {"message": "Survey started", "state": simulation_engine.state}

@api_router.post("/survey/pause")
@api_router.post("/v1/survey/pause")
async def pause_survey():
    await simulation_engine.pause()
    return {"message": "Survey paused", "state": simulation_engine.state}

@api_router.post("/survey/reset")
@api_router.post("/v1/survey/reset")
async def reset_survey():
    await simulation_engine.reset()
    return {"message": "Survey reset to initial state", "state": simulation_engine.state}

@api_router.post("/survey/speed")
@api_router.post("/v1/survey/speed")
async def set_survey_speed(body: SpeedRequest):
    await simulation_engine.set_speed(body.speed)
    return {"message": f"Simulation speed set to {body.speed}x", "speed": simulation_engine.config.simulation_speed}

@api_router.get("/survey/measurements", response_model=List[SurveyMeasurement])
@api_router.get("/v1/survey/measurements", response_model=List[SurveyMeasurement])
async def get_survey_measurements(limit: Optional[int] = Query(None, ge=1, le=2000)):
    meas = simulation_engine.measurements
    if limit:
        return meas[-limit:]
    return meas

# --- 3. Telemetry ---
@api_router.get("/telemetry", response_model=List[TelemetryPoint])
@api_router.get("/v1/telemetry/live", response_model=List[TelemetryPoint])
async def get_telemetry(limit: int = Query(50, ge=1, le=200)):
    return simulation_engine.telemetry_history[-limit:]

# --- 4. Node Status Array ---
@api_router.get("/nodes", response_model=List[NodeStatus])
@api_router.get("/v1/nodes", response_model=List[NodeStatus])
async def get_nodes():
    return simulation_engine.get_node_statuses()

# --- 5. Detection & Anomaly Results ---
@api_router.get("/detection/latest", response_model=List[DetectionResult])
@api_router.get("/v1/detection/results", response_model=List[DetectionResult])
async def get_detection_results(limit: int = Query(30, ge=1, le=100)):
    return simulation_engine.detection_results[-limit:]

@api_router.get("/detection/status", response_model=DetectionStatus)
@api_router.get("/v1/detection/status", response_model=DetectionStatus)
async def get_detection_status():
    return simulation_engine.get_detection_status()

# --- 6. Prospective Targets ---
@api_router.get("/targets", response_model=List[Target])
@api_router.get("/v1/targets", response_model=List[Target])
async def get_targets():
    return simulation_engine.targets

@api_router.get("/targets/{target_id}", response_model=Target)
async def get_target_by_id(target_id: str):
    target = next((t for t in simulation_engine.targets if t.id == target_id), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"Target '{target_id}' not found")
    return target

# --- 7. Spatial Map & Grid Cells ---
@api_router.get("/map", response_model=List[MapCell])
@api_router.get("/mapping/cells", response_model=List[MapCell])
@api_router.get("/v1/mapping/cells", response_model=List[MapCell])
async def get_map_cells():
    return simulation_engine.map_cells

# --- 8. Adaptive Resurvey ---
@api_router.get("/resurvey/state", response_model=Optional[ResurveyState])
@api_router.get("/v1/resurvey/state", response_model=Optional[ResurveyState])
async def get_resurvey_state():
    if simulation_engine.resurvey_state:
        return simulation_engine.resurvey_state
    
    first_target = simulation_engine.targets[0] if simulation_engine.targets else None
    if first_target:
        from models.schemas import ResurveyMetrics
        return ResurveyState(
            targetId=first_target.id,
            phase="TARGET_IDENTIFIED",
            before=ResurveyMetrics(
                prospectivity=first_target.prospectivity,
                confidence=first_target.confidence,
                uncertainty=first_target.uncertainty,
                measurementDensity=1.0
            ),
            after=None
        )
    return None

@api_router.post("/resurvey/start", response_model=ResurveyState)
@api_router.post("/resurvey/trigger", response_model=ResurveyState)
@api_router.post("/v1/resurvey/trigger", response_model=ResurveyState)
async def start_resurvey(body: Optional[ResurveyRequest] = None):
    # Determine target ID
    target_id = None
    if body:
        target_id = body.target_id or body.targetId
    if not target_id and simulation_engine.targets:
        target_id = simulation_engine.targets[0].id

    if not target_id:
        raise HTTPException(status_code=400, detail="No target identified for resurvey")

    success, msg, resurvey_state = await simulation_engine.run_resurvey(target_id)
    if not success or not resurvey_state:
        raise HTTPException(status_code=400, detail=msg)

    return resurvey_state

# --- 9. Validation Benchmarks ---
@api_router.get("/validation", response_model=List[ValidationResult])
@api_router.get("/v1/validation/benchmarks", response_model=List[ValidationResult])
async def get_validation():
    return simulation_engine.get_validation_results()

# --- 10. Configuration ---
@api_router.get("/config")
@api_router.get("/v1/config")
async def get_configuration():
    return simulation_engine.config.model_dump(by_alias=True)

@api_router.put("/config")
@api_router.put("/v1/config")
async def update_configuration(new_config: Dict[str, Any]):
    try:
        # Map camelCase to snake_case if necessary
        mapped = {}
        alias_map = {
            "emFrequency": "em_frequency",
            "surveyGridSizeX": "survey_grid_size_x",
            "surveyGridSizeY": "survey_grid_size_y",
            "gridSpacing": "grid_spacing",
            "nodeCount": "node_count",
            "anomalyThreshold": "anomaly_threshold",
            "prospectivityThreshold": "prospectivity_threshold",
            "resurveyThreshold": "resurvey_threshold",
            "simulationSpeed": "simulation_speed",
            "simulationSeed": "simulation_seed"
        }
        for k, v in new_config.items():
            mapped[alias_map.get(k, k)] = v

        current_dict = simulation_engine.config.model_dump()
        current_dict.update(mapped)
        updated = SystemConfiguration(**current_dict)
        simulation_engine.config = updated
        simulation_engine.detection_engine.config = updated
        simulation_engine.mapping_engine.config = updated
        simulation_engine.resurvey_engine.config = updated

        security_engine.log_event(
            event_type="CONFIGURATION_VERIFIED",
            severity="INFO",
            node_id="SYSTEM",
            description="System operating parameters updated and validated."
        )
        return simulation_engine.config.model_dump(by_alias=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid configuration parameters: {str(e)}")

# --- 11. Data Export (CSV & JSON) ---
@api_router.get("/export/csv")
async def export_csv():
    """
    Exports current survey measurements as RFC 4180 CSV.
    """
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header requested by prompt
    writer.writerow([
        "timestamp", "survey_id", "node_id", "x", "y", "depth",
        "em_amplitude", "em_phase", "magnetic_field", "signal_quality",
        "anomaly_score", "prospectivity", "confidence", "uncertainty"
    ])

    for m in simulation_engine.measurements:
        # Match with detection result for confidence if available
        writer.writerow([
            m.timestamp,
            "SVY-2026-001",
            m.node_id,
            m.x,
            m.y,
            m.depth,
            m.em_amplitude,
            m.em_phase,
            m.magnetic_field,
            0.92,
            m.anomaly_score,
            m.prospectivity,
            round(1.0 - m.uncertainty, 3),
            m.uncertainty
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=seamark_survey_export.csv"}
    )

@api_router.get("/export/json")
async def export_json():
    """
    Exports structured survey and detection state.
    """
    return {
        "metadata": {
            "project": "SEAMARK SIH 26064",
            "classification": "SIMULATION / PROTOTYPE DATA",
            "surveyId": "SVY-2026-001",
            "exportedAt": simulation_engine.get_survey_status().elapsed_time
        },
        "systemStatus": simulation_engine.get_system_status().model_dump(by_alias=True),
        "surveyStatus": simulation_engine.get_survey_status().model_dump(by_alias=True),
        "detectionStatus": simulation_engine.get_detection_status().model_dump(by_alias=True),
        "targets": [t.model_dump(by_alias=True) for t in simulation_engine.targets],
        "measurementsCount": len(simulation_engine.measurements),
        "measurements": [m.model_dump(by_alias=True) for m in simulation_engine.measurements]
    }

# --- 12. Cybersecurity & Packet Integrity ---
@api_router.get("/security/status", response_model=SecurityStatus)
async def get_security_status():
    return security_engine.get_status()

@api_router.get("/security/events", response_model=List[SecurityEvent])
async def get_security_events(limit: int = Query(50, ge=1, le=100)):
    return security_engine.audit_log[-limit:]

@api_router.post("/security/simulate-event")
async def trigger_security_simulation(body: SecuritySimRequest):
    event = security_engine.simulate_security_anomaly(body.anomaly_type, body.node_id)
    return {"message": "Security event injected", "event": event}
