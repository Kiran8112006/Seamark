// ============================================================
// SEAMARK — Centralized Mock Data Service
// ============================================================
import type {
  SystemStatus,
  SurveyStatus,
  DetectionStatus,
  TelemetryPoint,
  SurveyMeasurement,
  NodeStatus,
  DetectionResult,
  Target,
  MapCell,
  ValidationResult,
  ResurveyState,
  SystemConfiguration,
} from '@/types';

// --- Deterministic helpers ---
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function gaussianNoise(seed: number, mean: number, std: number): number {
  const u1 = seededRandom(seed);
  const u2 = seededRandom(seed + 1);
  const z = Math.sqrt(-2 * Math.log(u1 + 0.001)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function ts(offsetMinutes: number): string {
  const d = new Date('2026-10-05T10:00:00Z');
  d.setMinutes(d.getMinutes() + offsetMinutes);
  return d.toISOString();
}

// --- Default configuration ---
export const DEFAULT_CONFIG: SystemConfiguration = {
  emFrequency: 2500,
  surveyGridSizeX: 20,
  surveyGridSizeY: 16,
  gridSpacing: 5,
  nodeCount: 4,
  anomalyThreshold: 0.6,
  prospectivityThreshold: 0.5,
  resurveyThreshold: 0.7,
  simulationSpeed: 1,
};

// --- Generate survey grid measurements ---
function generateGridMeasurements(
  config: SystemConfiguration,
  completedSteps: number
): SurveyMeasurement[] {
  const measurements: SurveyMeasurement[] = [];
  const totalCells = config.surveyGridSizeX * config.surveyGridSizeY;
  const steps = Math.min(completedSteps, totalCells);

  // Create anomaly zones — deterministic
  const anomalyZones = [
    { cx: 8, cy: 6, r: 3, strength: 0.85 },
    { cx: 14, cy: 10, r: 2.5, strength: 0.72 },
    { cx: 4, cy: 12, r: 2, strength: 0.65 },
  ];

  for (let i = 0; i < steps; i++) {
    // Boustrophedon path
    const row = Math.floor(i / config.surveyGridSizeX);
    const colRaw = i % config.surveyGridSizeX;
    const col = row % 2 === 0 ? colRaw : config.surveyGridSizeX - 1 - colRaw;

    const x = col * config.gridSpacing;
    const y = row * config.gridSpacing;
    const seed = col * 1000 + row;

    // Anomaly contribution
    let anomalyContrib = 0;
    for (const z of anomalyZones) {
      const dist = Math.sqrt((col - z.cx) ** 2 + (row - z.cy) ** 2);
      if (dist < z.r) {
        anomalyContrib = Math.max(anomalyContrib, z.strength * (1 - dist / z.r));
      }
    }

    const baseEM = 0.15 + gaussianNoise(seed, 0, 0.05);
    const emAmplitude = clamp(baseEM + anomalyContrib * 0.8, 0, 1);
    const emPhase = clamp(45 + gaussianNoise(seed + 100, 0, 8) + anomalyContrib * 30, 0, 180);
    const magneticField = clamp(
      48000 + gaussianNoise(seed + 200, 0, 200) + anomalyContrib * 2000,
      45000,
      55000
    );
    const anomalyScore = clamp(anomalyContrib + gaussianNoise(seed + 300, 0, 0.05), 0, 1);
    const prospectivity = clamp(anomalyScore * 0.9 + gaussianNoise(seed + 400, 0, 0.03), 0, 1);
    const uncertainty = clamp(0.3 - anomalyContrib * 0.15 + gaussianNoise(seed + 500, 0, 0.05), 0.05, 0.6);

    const nodeIndex = (i % (config.nodeCount - 1)) + 1;
    measurements.push({
      id: `M-${String(i + 1).padStart(4, '0')}`,
      x,
      y,
      depth: clamp(4200 + gaussianNoise(seed + 600, 0, 50), 4000, 4500),
      emAmplitude,
      emPhase,
      magneticField,
      anomalyScore,
      prospectivity,
      uncertainty,
      timestamp: ts(i * 0.5),
      nodeId: `SN-${String(nodeIndex).padStart(2, '0')}`,
    });
  }

  return measurements;
}

// --- Build map cells from measurements ---
function buildMapCells(
  config: SystemConfiguration,
  measurements: SurveyMeasurement[]
): MapCell[] {
  const cells: MapCell[] = [];
  const measMap = new Map<string, SurveyMeasurement>();
  for (const m of measurements) {
    const key = `${Math.round(m.x / config.gridSpacing)},${Math.round(m.y / config.gridSpacing)}`;
    measMap.set(key, m);
  }

  for (let row = 0; row < config.surveyGridSizeY; row++) {
    for (let col = 0; col < config.surveyGridSizeX; col++) {
      const key = `${col},${row}`;
      const m = measMap.get(key);

      if (m) {
        cells.push({
          x: col,
          y: row,
          coverage: 'MEASURED',
          emAnomaly: m.emAmplitude,
          magnetic: m.magneticField,
          prospectivity: m.prospectivity,
          uncertainty: m.uncertainty,
          hasTarget: m.anomalyScore > config.anomalyThreshold,
          measurementCount: 1,
        });
      } else {
        // Check if adjacent cells have measurements for interpolation
        const neighbors = [
          measMap.get(`${col - 1},${row}`),
          measMap.get(`${col + 1},${row}`),
          measMap.get(`${col},${row - 1}`),
          measMap.get(`${col},${row + 1}`),
        ].filter(Boolean);

        if (neighbors.length >= 2) {
          const avg = (field: keyof SurveyMeasurement) => {
            const vals = neighbors.map((n) => n![field] as number);
            return vals.reduce((a, b) => a + b, 0) / vals.length;
          };
          cells.push({
            x: col,
            y: row,
            coverage: 'INTERPOLATED',
            emAnomaly: avg('emAmplitude'),
            magnetic: avg('magneticField'),
            prospectivity: avg('prospectivity'),
            uncertainty: avg('uncertainty') * 1.5,
            hasTarget: false,
            measurementCount: 0,
          });
        } else {
          cells.push({
            x: col,
            y: row,
            coverage: 'NO_DATA',
            emAnomaly: null,
            magnetic: null,
            prospectivity: null,
            uncertainty: null,
            hasTarget: false,
            measurementCount: 0,
          });
        }
      }
    }
  }

  return cells;
}

// --- Detect targets from measurements ---
function detectTargets(
  measurements: SurveyMeasurement[],
  config: SystemConfiguration
): Target[] {
  const high = measurements.filter((m) => m.anomalyScore > config.anomalyThreshold);
  // Cluster nearby high-anomaly points
  const visited = new Set<string>();
  const targets: Target[] = [];
  let tid = 1;

  for (const m of high) {
    if (visited.has(m.id)) continue;
    const cluster = [m];
    visited.add(m.id);

    for (const other of high) {
      if (visited.has(other.id)) continue;
      const dist = Math.sqrt((m.x - other.x) ** 2 + (m.y - other.y) ** 2);
      if (dist < config.gridSpacing * 3) {
        cluster.push(other);
        visited.add(other.id);
      }
    }

    const avgX = cluster.reduce((s, c) => s + c.x, 0) / cluster.length;
    const avgY = cluster.reduce((s, c) => s + c.y, 0) / cluster.length;
    const avgDepth = cluster.reduce((s, c) => s + c.depth, 0) / cluster.length;
    const maxProsp = Math.max(...cluster.map((c) => c.prospectivity));
    const avgConf = clamp(0.5 + cluster.length * 0.08, 0, 1);
    const avgUnc = cluster.reduce((s, c) => s + c.uncertainty, 0) / cluster.length;

    const evidence: string[] = [];
    if (maxProsp > 0.6) evidence.push('Elevated EM response above background');
    if (cluster.length > 1) evidence.push('Spatial consistency across multiple cells');
    if (avgUnc < 0.3) evidence.push('Acceptable signal quality');
    const maxMag = Math.max(...cluster.map((c) => c.magneticField));
    if (maxMag > 49000) evidence.push('Supporting magnetic response');

    targets.push({
      id: `T-${String(tid).padStart(3, '0')}`,
      x: Math.round(avgX * 10) / 10,
      y: Math.round(avgY * 10) / 10,
      depth: Math.round(avgDepth),
      prospectivity: Math.round(maxProsp * 1000) / 1000,
      confidence: Math.round(avgConf * 1000) / 1000,
      uncertainty: Math.round(avgUnc * 1000) / 1000,
      emResponse: Math.round(Math.max(...cluster.map((c) => c.emAmplitude)) * 1000) / 1000,
      magneticResponse: Math.round(maxMag),
      signalQuality: Math.round(clamp(0.7 + seededRandom(tid) * 0.25, 0, 1) * 1000) / 1000,
      status: 'IDENTIFIED',
      evidence,
      recommendedAction: maxProsp > config.resurveyThreshold ? 'Targeted resurvey' : 'Monitor',
    });
    tid++;
  }

  return targets;
}

// --- Generate detection analysis ---
function generateDetection(measurements: SurveyMeasurement[]): DetectionResult[] {
  if (measurements.length === 0) return [];

  const results: DetectionResult[] = [];
  const highAnom = measurements.filter((m) => m.anomalyScore > 0.4);
  const subset = highAnom.length > 0 ? highAnom.slice(0, 5) : measurements.slice(0, 5);

  for (let i = 0; i < subset.length; i++) {
    const m = subset[i];
    const rawSignal: number[] = [];
    const filteredSignal: number[] = [];
    const frequencyResponse: number[] = [];

    for (let j = 0; j < 100; j++) {
      const base = m.emAmplitude * Math.sin(j * 0.2) + gaussianNoise(i * 100 + j, 0, 0.08);
      rawSignal.push(base);
      // Simple low-pass
      filteredSignal.push(
        j > 0
          ? filteredSignal[j - 1] * 0.7 + base * 0.3
          : base
      );
      frequencyResponse.push(
        Math.max(0, gaussianNoise(i * 200 + j, 0.3, 0.15) * Math.exp(-j / 40))
      );
    }

    results.push({
      id: `D-${String(i + 1).padStart(3, '0')}`,
      x: m.x,
      y: m.y,
      rawSignal,
      filteredSignal,
      amplitude: m.emAmplitude,
      phase: m.emPhase,
      background: 0.12,
      anomalyScore: m.anomalyScore,
      frequencyResponse,
      prospectivity: m.prospectivity,
      confidence: clamp(0.5 + m.anomalyScore * 0.4, 0, 1),
      uncertainty: m.uncertainty,
    });
  }

  return results;
}

// --- Telemetry stream from measurements ---
function generateTelemetry(measurements: SurveyMeasurement[]): TelemetryPoint[] {
  return measurements.map((m) => ({
    timestamp: m.timestamp,
    nodeId: m.nodeId,
    x: m.x,
    y: m.y,
    depth: m.depth,
    emAmplitude: m.emAmplitude,
    emPhase: m.emPhase,
    magneticField: m.magneticField,
    signalQuality: clamp(0.7 + seededRandom(parseInt(m.id.slice(2))) * 0.25, 0, 1),
    temperature: clamp(2.1 + gaussianNoise(parseInt(m.id.slice(2)), 0, 0.3), 1.0, 4.0),
    battery: clamp(85 - parseInt(m.id.slice(2)) * 0.05, 50, 100),
    anomalyScore: m.anomalyScore,
  }));
}

// --- Nodes ---
function generateNodes(config: SystemConfiguration): NodeStatus[] {
  const nodes: NodeStatus[] = [];
  nodes.push({
    id: 'RN-01',
    role: 'REFERENCE',
    position: { x: 0, y: 0, z: -4200 },
    depth: 4200,
    battery: 94,
    temperature: 2.1,
    communication: 'ONLINE',
    signalQuality: 0.96,
    sensorHealth: 'NOMINAL',
    lastPacket: ts(0),
  });

  for (let i = 1; i < config.nodeCount; i++) {
    const degraded = i === 3;
    nodes.push({
      id: `SN-${String(i).padStart(2, '0')}`,
      role: 'SURVEY',
      position: {
        x: 20 + i * 25,
        y: 10 + i * 15,
        z: -4200 - i * 10,
      },
      depth: 4200 + i * 10,
      battery: clamp(88 - i * 5, 50, 100),
      temperature: clamp(2.1 + i * 0.1, 1.5, 4.0),
      communication: degraded ? 'WARNING' : 'ONLINE',
      signalQuality: degraded ? 0.62 : clamp(0.85 + seededRandom(i) * 0.12, 0, 1),
      sensorHealth: degraded ? 'WARNING' : 'NOMINAL',
      lastPacket: ts(i * 2),
    });
  }

  return nodes;
}

// --- Validation ---
function generateValidation(): ValidationResult[] {
  return [
    // SENSING VALIDATION
    { category: 'Sensing', metric: 'EM Frequency Response', value: '2500 Hz', unit: 'Hz', status: 'PASS', threshold: '1000–5000 Hz', notes: 'Within operating range' },
    { category: 'Sensing', metric: 'EM Sensitivity', value: 0.15, unit: 'mV/m', status: 'PASS', threshold: '< 0.5 mV/m', notes: 'Meets minimum detectable signal' },
    { category: 'Sensing', metric: 'Magnetic Resolution', value: 0.5, unit: 'nT', status: 'PASS', threshold: '< 1 nT', notes: 'Adequate for anomaly detection' },
    { category: 'Sensing', metric: 'Phase Accuracy', value: 2.3, unit: '°', status: 'PASS', threshold: '< 5°', notes: 'Simulation data — not lab-verified' },
    { category: 'Sensing', metric: 'Signal-to-Noise Ratio', value: 18.4, unit: 'dB', status: 'PASS', threshold: '> 12 dB', notes: 'Simulated environment' },

    // MAPPING VALIDATION
    { category: 'Mapping', metric: 'Grid Coverage', value: '82%', unit: '%', status: 'PASS', threshold: '> 70%', notes: 'Of planned survey area' },
    { category: 'Mapping', metric: 'Position Accuracy', value: 0.8, unit: 'm', status: 'PASS', threshold: '< 2 m', notes: 'Acoustic positioning' },
    { category: 'Mapping', metric: 'Interpolation Error', value: 12.3, unit: '%', status: 'MARGINAL', threshold: '< 10%', notes: 'Slightly above threshold in sparse areas' },

    // DETECTION VALIDATION
    { category: 'Detection', metric: 'True Positive Rate', value: '78%', unit: '%', status: 'PASS', threshold: '> 70%', notes: 'Against simulated ground truth' },
    { category: 'Detection', metric: 'False Positive Rate', value: '15%', unit: '%', status: 'MARGINAL', threshold: '< 10%', notes: 'Higher in heterogeneous substrate' },
    { category: 'Detection', metric: 'Anomaly Localization', value: 2.1, unit: 'm', status: 'PASS', threshold: '< 5 m', notes: 'Centroid accuracy' },

    // RESURVEY VALIDATION
    { category: 'Resurvey', metric: 'Uncertainty Reduction', value: '42%', unit: '%', status: 'PASS', threshold: '> 25%', notes: 'After targeted resurvey' },
    { category: 'Resurvey', metric: 'Confidence Improvement', value: '31%', unit: '%', status: 'PASS', threshold: '> 20%', notes: 'Adaptive sampling effective' },

    // SYSTEM PERFORMANCE
    { category: 'System', metric: 'Node Communication', value: '97%', unit: '%', status: 'PASS', threshold: '> 90%', notes: 'Packet delivery rate' },
    { category: 'System', metric: 'Battery Endurance', value: 14.2, unit: 'hrs', status: 'PASS', threshold: '> 8 hrs', notes: 'Estimated from simulation' },
    { category: 'System', metric: 'Processing Latency', value: 230, unit: 'ms', status: 'PASS', threshold: '< 1000 ms', notes: 'Per measurement cycle' },
    { category: 'System', metric: 'Data Integrity', value: '99.8%', unit: '%', status: 'PASS', threshold: '> 99%', notes: 'CRC check pass rate' },
  ];
}

// ============================================================
// PUBLIC API — Service Interface
// ============================================================

export function getSystemStatus(): SystemStatus {
  return {
    operational: true,
    telemetryActive: true,
    nodesOnline: 3,
    totalNodes: 4,
    lastMeasurement: ts(0),
    systemMode: 'PROTOTYPE',
    dataSource: 'SIMULATION',
    uptime: 14520,
  };
}

export function getSurveyStatus(completedSteps: number, config: SystemConfiguration): SurveyStatus {
  const totalCells = config.surveyGridSizeX * config.surveyGridSizeY;
  const steps = Math.min(completedSteps, totalCells);
  const row = Math.floor(steps / config.surveyGridSizeX);
  const colRaw = steps % config.surveyGridSizeX;
  const col = row % 2 === 0 ? colRaw : config.surveyGridSizeX - 1 - colRaw;

  return {
    surveyId: 'SVY-2026-001',
    progress: Math.round((steps / totalCells) * 100),
    areaCovered: steps * config.gridSpacing * config.gridSpacing,
    totalArea: totalCells * config.gridSpacing * config.gridSpacing,
    measurements: steps,
    currentPosition: {
      x: col * config.gridSpacing,
      y: row * config.gridSpacing,
    },
    state: steps === 0 ? 'IDLE' : steps >= totalCells ? 'COMPLETED' : 'RUNNING',
    startTime: steps > 0 ? ts(0) : null,
    elapsedTime: steps * 30,
  };
}

export function getDetectionStatus(
  measurements: SurveyMeasurement[],
  config: SystemConfiguration
): DetectionStatus {
  const anomalies = measurements.filter((m) => m.anomalyScore > config.anomalyThreshold).length;
  const targets = detectTargets(measurements, config);
  const highProsp = measurements.filter((m) => m.prospectivity > config.prospectivityThreshold).length;
  const highestProsp = measurements.length > 0
    ? Math.max(...measurements.map((m) => m.prospectivity))
    : 0;
  const meanUnc = measurements.length > 0
    ? measurements.reduce((s, m) => s + m.uncertainty, 0) / measurements.length
    : 0;

  return {
    anomalies,
    highProspectivityAreas: highProsp,
    targets: targets.length,
    highestProspectivity: Math.round(highestProsp * 1000) / 1000,
    meanUncertainty: Math.round(meanUnc * 1000) / 1000,
  };
}

export function getMeasurements(completedSteps: number, config: SystemConfiguration): SurveyMeasurement[] {
  return generateGridMeasurements(config, completedSteps);
}

export function getTelemetry(measurements: SurveyMeasurement[]): TelemetryPoint[] {
  return generateTelemetry(measurements);
}

export function getNodes(config: SystemConfiguration): NodeStatus[] {
  return generateNodes(config);
}

export function getDetection(measurements: SurveyMeasurement[]): DetectionResult[] {
  return generateDetection(measurements);
}

export function getTargets(measurements: SurveyMeasurement[], config: SystemConfiguration): Target[] {
  return detectTargets(measurements, config);
}

export function getMapCells(config: SystemConfiguration, measurements: SurveyMeasurement[]): MapCell[] {
  return buildMapCells(config, measurements);
}

export function getValidation(): ValidationResult[] {
  return generateValidation();
}

export function getResurveyState(target: Target | null): ResurveyState {
  if (!target) {
    return {
      targetId: '',
      phase: 'INITIAL',
      before: { prospectivity: 0, confidence: 0, uncertainty: 0, measurementDensity: 0 },
      after: null,
    };
  }
  return {
    targetId: target.id,
    phase: 'TARGET_IDENTIFIED',
    before: {
      prospectivity: target.prospectivity,
      confidence: target.confidence,
      uncertainty: target.uncertainty,
      measurementDensity: 1,
    },
    after: null,
  };
}

export function getResurveyComplete(target: Target): ResurveyState {
  return {
    targetId: target.id,
    phase: 'RESURVEY_COMPLETE',
    before: {
      prospectivity: target.prospectivity,
      confidence: target.confidence,
      uncertainty: target.uncertainty,
      measurementDensity: 1,
    },
    after: {
      prospectivity: clamp(target.prospectivity + 0.05, 0, 1),
      confidence: clamp(target.confidence + 0.18, 0, 1),
      uncertainty: clamp(target.uncertainty - 0.12, 0.05, 1),
      measurementDensity: 4,
    },
  };
}
