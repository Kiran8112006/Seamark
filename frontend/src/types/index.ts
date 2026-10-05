// ============================================================
// SEAMARK — Type Definitions
// ============================================================

export interface SystemStatus {
  operational: boolean;
  telemetryActive: boolean;
  nodesOnline: number;
  totalNodes: number;
  lastMeasurement: string;
  systemMode: 'PROTOTYPE' | 'OPERATIONAL';
  dataSource: 'SIMULATION' | 'LIVE';
  uptime: number; // seconds
}

export interface SurveyStatus {
  surveyId: string;
  progress: number; // 0-100
  areaCovered: number; // sq meters
  totalArea: number;
  measurements: number;
  currentPosition: { x: number; y: number };
  state: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  startTime: string | null;
  elapsedTime: number; // seconds
}

export interface DetectionStatus {
  anomalies: number;
  highProspectivityAreas: number;
  targets: number;
  highestProspectivity: number;
  meanUncertainty: number;
}

export interface TelemetryPoint {
  timestamp: string;
  nodeId: string;
  x: number;
  y: number;
  depth: number;
  emAmplitude: number;
  emPhase: number;
  magneticField: number;
  signalQuality: number;
  temperature: number;
  battery: number;
  anomalyScore: number;
}

export interface SurveyMeasurement {
  id: string;
  x: number;
  y: number;
  depth: number;
  emAmplitude: number;
  emPhase: number;
  magneticField: number;
  anomalyScore: number;
  prospectivity: number;
  uncertainty: number;
  timestamp: string;
  nodeId: string;
}

export interface NodeStatus {
  id: string;
  role: 'REFERENCE' | 'SURVEY';
  position: { x: number; y: number; z: number };
  depth: number;
  battery: number;
  temperature: number;
  communication: 'ONLINE' | 'WARNING' | 'DEGRADED' | 'OFFLINE';
  signalQuality: number;
  sensorHealth: 'NOMINAL' | 'WARNING' | 'DEGRADED' | 'FAULT';
  lastPacket: string;
}

export interface DetectionResult {
  id: string;
  x: number;
  y: number;
  rawSignal: number[];
  filteredSignal: number[];
  amplitude: number;
  phase: number;
  background: number;
  anomalyScore: number;
  frequencyResponse: number[];
  prospectivity: number;
  confidence: number;
  uncertainty: number;
}

export interface Target {
  id: string;
  x: number;
  y: number;
  depth: number;
  prospectivity: number;
  confidence: number;
  uncertainty: number;
  emResponse: number;
  magneticResponse: number;
  signalQuality: number;
  status: 'IDENTIFIED' | 'RESURVEY_PENDING' | 'RESURVEY_COMPLETE' | 'CONFIRMED' | 'REJECTED';
  evidence: string[];
  recommendedAction: string;
}

export interface MapCell {
  x: number;
  y: number;
  coverage: 'MEASURED' | 'INTERPOLATED' | 'NO_DATA';
  emAnomaly: number | null;
  magnetic: number | null;
  prospectivity: number | null;
  uncertainty: number | null;
  hasTarget: boolean;
  measurementCount: number;
}

export interface ValidationResult {
  category: string;
  metric: string;
  value: number | string;
  unit: string;
  status: 'PASS' | 'MARGINAL' | 'FAIL' | 'N/A';
  threshold: string;
  notes: string;
}

export interface ResurveyState {
  targetId: string;
  phase: 'INITIAL' | 'TARGET_IDENTIFIED' | 'RESURVEY_RECOMMENDED' | 'RESURVEY_RUNNING' | 'RESURVEY_COMPLETE';
  before: {
    prospectivity: number;
    confidence: number;
    uncertainty: number;
    measurementDensity: number;
  };
  after: {
    prospectivity: number;
    confidence: number;
    uncertainty: number;
    measurementDensity: number;
  } | null;
}

export interface SystemConfiguration {
  emFrequency: number;        // Hz
  surveyGridSizeX: number;    // cells
  surveyGridSizeY: number;    // cells
  gridSpacing: number;        // meters
  nodeCount: number;
  anomalyThreshold: number;   // 0-1
  prospectivityThreshold: number; // 0-1
  resurveyThreshold: number;  // 0-1
  simulationSpeed: number;    // multiplier
}

export interface DemoState {
  running: boolean;
  paused: boolean;
  speed: number;
  tick: number;
  surveyStep: number;
  totalSurveySteps: number;
}

export type NavSection = {
  title: string;
  items: NavItem[];
};

export type NavItem = {
  label: string;
  href: string;
  icon: string;
};

export interface SecurityEvent {
  id: string;
  timestamp: string;
  eventType: string;
  severity: 'INFO' | 'WARNING' | 'ALERT';
  nodeId: string;
  description: string;
}

export interface SecurityStatus {
  totalPacketsVerified: number;
  sequenceGaps: number;
  replayAttemptsBlocked: number;
  unauthorizedNodesBlocked: number;
  lastAuditEvent: string | null;
  cryptographicIntegrity: string;
}
