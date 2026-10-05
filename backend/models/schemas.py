# ============================================================
# SEAMARK — Pydantic Data Models (SIH 26064)
# Supports both camelCase and snake_case for frontend interoperability
# ============================================================
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Union, Dict, Any

class BaseApiSchema(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        serialize_by_alias=True
    )

class Position2D(BaseApiSchema):
    x: float
    y: float

class Position3D(BaseApiSchema):
    x: float
    y: float
    z: float

class SystemStatus(BaseApiSchema):
    operational: bool = True
    telemetry_active: bool = Field(default=True, alias="telemetryActive")
    nodes_online: int = Field(default=4, alias="nodesOnline")
    total_nodes: int = Field(default=4, alias="totalNodes")
    last_measurement: str = Field(default="", alias="lastMeasurement")
    system_mode: str = Field(default="PROTOTYPE", alias="systemMode")
    data_source: str = Field(default="SIMULATION", alias="dataSource")
    uptime: float = 0.0

class SurveyStatus(BaseApiSchema):
    survey_id: str = Field(default="SVY-2026-001", alias="surveyId")
    progress: float = Field(default=0.0, description="0-100 percentage")
    area_covered: float = Field(default=0.0, alias="areaCovered")
    total_area: float = Field(default=2500.0, alias="totalArea")
    measurements: int = 0
    current_position: Position2D = Field(default_factory=lambda: Position2D(x=0.0, y=0.0), alias="currentPosition")
    state: str = Field(default="IDLE") # IDLE, RUNNING, PAUSED, COMPLETED, RESURVEY
    start_time: Optional[str] = Field(default=None, alias="startTime")
    elapsed_time: float = Field(default=0.0, alias="elapsedTime")

class DetectionStatus(BaseApiSchema):
    anomalies: int = 0
    high_prospectivity_areas: int = Field(default=0, alias="highProspectivityAreas")
    targets: int = 0
    highest_prospectivity: float = Field(default=0.0, alias="highestProspectivity")
    mean_uncertainty: float = Field(default=0.0, alias="meanUncertainty")

class TelemetryPoint(BaseApiSchema):
    timestamp: str
    node_id: str = Field(alias="nodeId")
    x: float
    y: float
    depth: float
    em_amplitude: float = Field(alias="emAmplitude")
    em_phase: float = Field(alias="emPhase")
    magnetic_field: float = Field(alias="magneticField")
    signal_quality: float = Field(alias="signalQuality")
    temperature: float
    battery: float
    anomaly_score: float = Field(alias="anomalyScore")
    roll: float = 0.0
    pitch: float = 0.0
    yaw: float = 0.0
    communication_status: str = Field(default="ONLINE", alias="communicationStatus")
    sensor_health: str = Field(default="NOMINAL", alias="sensorHealth")

class SurveyMeasurement(BaseApiSchema):
    id: str
    x: float
    y: float
    depth: float
    em_amplitude: float = Field(alias="emAmplitude")
    em_phase: float = Field(alias="emPhase")
    magnetic_field: float = Field(alias="magneticField")
    anomaly_score: float = Field(alias="anomalyScore")
    prospectivity: float
    uncertainty: float
    timestamp: str
    node_id: str = Field(alias="nodeId")

class NodeStatus(BaseApiSchema):
    id: str
    role: str = "SURVEY" # REFERENCE | SURVEY
    position: Position3D
    depth: float
    battery: float
    temperature: float
    communication: str = "ONLINE" # ONLINE | WARNING | DEGRADED | OFFLINE
    signal_quality: float = Field(default=1.0, alias="signalQuality")
    sensor_health: str = Field(default="NOMINAL", alias="sensorHealth") # NOMINAL | WARNING | DEGRADED | FAULT
    last_packet: str = Field(alias="lastPacket")

class DetectionResult(BaseApiSchema):
    id: str
    x: float
    y: float
    raw_signal: List[float] = Field(alias="rawSignal")
    filtered_signal: List[float] = Field(alias="filteredSignal")
    amplitude: float
    phase: float
    background: float
    anomaly_score: float = Field(alias="anomalyScore")
    frequency_response: List[float] = Field(alias="frequencyResponse")
    prospectivity: float
    confidence: float
    uncertainty: float

class Target(BaseApiSchema):
    id: str
    x: float
    y: float
    depth: float
    prospectivity: float
    confidence: float
    uncertainty: float
    em_response: float = Field(alias="emResponse")
    magnetic_response: float = Field(alias="magneticResponse")
    signal_quality: float = Field(alias="signalQuality")
    status: str = "IDENTIFIED" # IDENTIFIED, RESURVEY_PENDING, RESURVEY_COMPLETE, CONFIRMED, REJECTED
    evidence: List[str]
    recommended_action: str = Field(alias="recommendedAction")

class MapCell(BaseApiSchema):
    x: float
    y: float
    coverage: str # MEASURED | INTERPOLATED | NO_DATA
    em_anomaly: Optional[float] = Field(default=None, alias="emAnomaly")
    magnetic: Optional[float] = None
    prospectivity: Optional[float] = None
    uncertainty: Optional[float] = None
    has_target: bool = Field(default=False, alias="hasTarget")
    measurement_count: int = Field(default=0, alias="measurementCount")

class ResurveyMetrics(BaseApiSchema):
    prospectivity: float
    confidence: float
    uncertainty: float
    measurement_density: float = Field(alias="measurementDensity")

class ResurveyState(BaseApiSchema):
    target_id: str = Field(default="", alias="targetId")
    phase: str = "INITIAL" # INITIAL | TARGET_IDENTIFIED | RESURVEY_RECOMMENDED | RESURVEY_RUNNING | RESURVEY_COMPLETE
    before: ResurveyMetrics
    after: Optional[ResurveyMetrics] = None

class ValidationResult(BaseApiSchema):
    category: str
    metric: str
    value: Union[float, str]
    unit: str
    status: str # PASS | MARGINAL | FAIL | N/A
    threshold: str
    notes: str

class SecurityEvent(BaseApiSchema):
    id: str
    timestamp: str
    event_type: str = Field(alias="eventType") # TELEMETRY_VERIFIED | SEQUENCE_GAP | REPLAY_DETECTED | INVALID_NODE | COMMUNICATION_DEGRADED | CONFIGURATION_VERIFIED
    severity: str = "INFO" # INFO | WARNING | ALERT
    node_id: str = Field(alias="nodeId")
    description: str

class SecurityStatus(BaseApiSchema):
    total_packets_verified: int = Field(alias="totalPacketsVerified")
    sequence_gaps: int = Field(alias="sequenceGaps")
    replay_attempts_blocked: int = Field(alias="replayAttemptsBlocked")
    unauthorized_nodes_blocked: int = Field(alias="unauthorizedNodesBlocked")
    last_audit_event: Optional[str] = Field(default=None, alias="lastAuditEvent")
    cryptographic_integrity: str = Field(default="NOMINAL", alias="cryptographicIntegrity")
