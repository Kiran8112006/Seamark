// ============================================================
// SEAMARK — API Service Interface for FastAPI Backend
// Connects to FastAPI simulation engine with automatic fallback
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
  SecurityStatus,
  SecurityEvent,
} from '@/types';
import * as mockData from './mockData';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
// Default to FastAPI backend unless explicitly forced to mock
const FORCE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export type DataSourceMode = 'BACKEND_SIMULATION' | 'OFFLINE_SIMULATION';

class ApiService {
  private baseUrl: string;
  public lastSource: DataSourceMode = 'BACKEND_SIMULATION';
  private listeners: ((source: DataSourceMode) => void)[] = [];

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  public subscribeSource(cb: (source: DataSourceMode) => void) {
    this.listeners.push(cb);
    cb(this.lastSource);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private setSource(source: DataSourceMode) {
    if (this.lastSource !== source) {
      this.lastSource = source;
      this.listeners.forEach((cb) => cb(source));
    }
  }

  private async request<T>(endpoint: string, options?: RequestInit, fallback?: () => T): Promise<T> {
    if (FORCE_MOCK) {
      this.setSource('OFFLINE_SIMULATION');
      if (fallback) return fallback();
      throw new Error(`Mock requested for ${endpoint} but no fallback available.`);
    }

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
        // Ensure fresh data from FastAPI simulation
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`API HTTP error ${res.status}: ${res.statusText}`);
      }

      const data = (await res.json()) as T;
      this.setSource('BACKEND_SIMULATION');
      return data;
    } catch (err) {
      this.setSource('OFFLINE_SIMULATION');
      if (fallback) {
        console.warn(`[Seamark API] Request to ${endpoint} failed, falling back to mockData.ts`, err);
        return fallback();
      }
      throw err;
    }
  }

  // --- System Status ---
  async getSystemStatus(): Promise<SystemStatus> {
    return this.request<SystemStatus>('/system/status', undefined, () => mockData.getSystemStatus());
  }

  // --- Survey Status & Grid ---
  async getSurveyStatus(surveyStep: number = 0, config?: SystemConfiguration): Promise<SurveyStatus> {
    return this.request<SurveyStatus>(
      '/survey/current',
      undefined,
      () => mockData.getSurveyStatus(surveyStep, config || mockData.DEFAULT_CONFIG)
    );
  }

  async startSurvey(): Promise<any> {
    return this.request('/survey/start', { method: 'POST' }, () => ({ state: 'RUNNING' }));
  }

  async pauseSurvey(): Promise<any> {
    return this.request('/survey/pause', { method: 'POST' }, () => ({ state: 'PAUSED' }));
  }

  async resetSurvey(): Promise<any> {
    return this.request('/survey/reset', { method: 'POST' }, () => ({ state: 'IDLE' }));
  }

  async setSurveySpeed(speed: number): Promise<any> {
    return this.request(
      '/survey/speed',
      {
        method: 'POST',
        body: JSON.stringify({ speed }),
      },
      () => ({ speed })
    );
  }

  async getMeasurements(completedSteps: number = 120, config?: SystemConfiguration): Promise<SurveyMeasurement[]> {
    return this.request<SurveyMeasurement[]>(
      '/survey/measurements',
      undefined,
      () => mockData.getMeasurements(completedSteps, config || mockData.DEFAULT_CONFIG)
    );
  }

  // --- Telemetry ---
  async getTelemetry(measurements?: SurveyMeasurement[]): Promise<TelemetryPoint[]> {
    return this.request<TelemetryPoint[]>(
      '/telemetry?limit=50',
      undefined,
      () => mockData.getTelemetry(measurements || [])
    );
  }

  // --- Sensor Node Array ---
  async getNodes(config?: SystemConfiguration): Promise<NodeStatus[]> {
    return this.request<NodeStatus[]>(
      '/nodes',
      undefined,
      () => mockData.getNodes(config || mockData.DEFAULT_CONFIG)
    );
  }

  // --- Detection & Anomalies ---
  async getDetectionStatus(measurements?: SurveyMeasurement[], config?: SystemConfiguration): Promise<DetectionStatus> {
    return this.request<DetectionStatus>(
      '/detection/status',
      undefined,
      () => mockData.getDetectionStatus(measurements || [], config || mockData.DEFAULT_CONFIG)
    );
  }

  async getDetectionResults(measurements?: SurveyMeasurement[]): Promise<DetectionResult[]> {
    return this.request<DetectionResult[]>(
      '/detection/latest?limit=30',
      undefined,
      () => mockData.getDetection(measurements || [])
    );
  }

  // --- Target Ranking ---
  async getTargets(measurements?: SurveyMeasurement[], config?: SystemConfiguration): Promise<Target[]> {
    return this.request<Target[]>(
      '/targets',
      undefined,
      () => mockData.getTargets(measurements || [], config || mockData.DEFAULT_CONFIG)
    );
  }

  // --- Spatial Heatmap Cells ---
  async getMapCells(config?: SystemConfiguration, measurements?: SurveyMeasurement[]): Promise<MapCell[]> {
    return this.request<MapCell[]>(
      '/map',
      undefined,
      () => mockData.getMapCells(config || mockData.DEFAULT_CONFIG, measurements || [])
    );
  }

  // --- Targeted Resurvey ---
  async getResurveyState(target?: Target | null): Promise<ResurveyState> {
    return this.request<ResurveyState>(
      '/resurvey/state',
      undefined,
      () => mockData.getResurveyState(target || null)
    );
  }

  async triggerResurvey(target: Target): Promise<ResurveyState> {
    return this.request<ResurveyState>(
      '/resurvey/start',
      {
        method: 'POST',
        body: JSON.stringify({ target_id: target.id }),
      },
      () => mockData.getResurveyComplete(target)
    );
  }

  // --- Validation Benchmarks ---
  async getValidation(): Promise<ValidationResult[]> {
    return this.request<ValidationResult[]>(
      '/validation',
      undefined,
      () => mockData.getValidation()
    );
  }

  // --- Configuration ---
  async getConfiguration(): Promise<SystemConfiguration> {
    return this.request<SystemConfiguration>(
      '/config',
      undefined,
      () => mockData.DEFAULT_CONFIG
    );
  }

  async updateConfiguration(config: Partial<SystemConfiguration>): Promise<SystemConfiguration> {
    return this.request<SystemConfiguration>(
      '/config',
      {
        method: 'PUT',
        body: JSON.stringify(config),
      },
      () => ({ ...mockData.DEFAULT_CONFIG, ...config })
    );
  }

  // --- Cybersecurity / Integrity ---
  async getSecurityStatus(): Promise<SecurityStatus> {
    return this.request<SecurityStatus>(
      '/security/status',
      undefined,
      () => ({
        totalPacketsVerified: 120,
        sequenceGaps: 0,
        replayAttemptsBlocked: 0,
        unauthorizedNodesBlocked: 0,
        lastAuditEvent: 'Telemetry packet cryptographically authenticated',
        cryptographicIntegrity: 'NOMINAL',
      })
    );
  }

  async getSecurityEvents(): Promise<SecurityEvent[]> {
    return this.request<SecurityEvent[]>(
      '/security/events?limit=40',
      undefined,
      () => [
        {
          id: 'SEC-0001',
          timestamp: new Date().toISOString(),
          eventType: 'CONFIGURATION_VERIFIED',
          severity: 'INFO',
          nodeId: 'SYSTEM',
          description: 'Cryptographic root keys and node identities verified.',
        },
      ]
    );
  }

  async simulateSecurityEvent(anomalyType: string, nodeId: string = 'SN-02'): Promise<any> {
    return this.request(
      '/security/simulate-event',
      {
        method: 'POST',
        body: JSON.stringify({ anomaly_type: anomalyType, node_id: nodeId }),
      },
      () => ({ message: 'Mock event recorded' })
    );
  }

  // --- Export Endpoints ---
  getExportCsvUrl(): string {
    return `${this.baseUrl}/export/csv`;
  }

  getExportJsonUrl(): string {
    return `${this.baseUrl}/export/json`;
  }
}

export const api = new ApiService();
