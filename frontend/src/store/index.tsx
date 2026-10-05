'use client';
// ============================================================
// SEAMARK — Global State Store (FastAPI Single Source of Truth)
// Synchronizes with FastAPI simulation backend with offline fallback
// ============================================================
import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect, useState } from 'react';
import type {
  SystemConfiguration,
  DemoState,
  SurveyMeasurement,
  Target,
  MapCell,
  TelemetryPoint,
  NodeStatus,
  DetectionResult,
  DetectionStatus,
  SurveyStatus,
  SystemStatus,
  SecurityStatus,
} from '@/types';
import { api, type DataSourceMode } from '@/services/api';
import {
  DEFAULT_CONFIG,
  getMeasurements,
  getSystemStatus as getMockSystemStatus,
  getSurveyStatus as getMockSurveyStatus,
  getDetectionStatus as getMockDetectionStatus,
  getTargets as getMockTargets,
  getMapCells as getMockMapCells,
  getTelemetry as getMockTelemetry,
  getNodes as getMockNodes,
  getDetection as getMockDetection,
} from '@/services/mockData';

export type DataSourceLabel = 'FASTAPI BACKEND (SIMULATION)' | 'OFFLINE SIMULATION';

interface StoreState {
  config: SystemConfiguration;
  demo: DemoState;
  surveyStep: number;
  measurements: SurveyMeasurement[];
  targets: Target[];
  mapCells: MapCell[];
  telemetry: TelemetryPoint[];
  nodes: NodeStatus[];
  detectionResults: DetectionResult[];
  detectionStatus: DetectionStatus;
  surveyStatus: SurveyStatus;
  systemStatus: SystemStatus;
  securityStatus: SecurityStatus;
  dataSourceLabel: DataSourceLabel;
  isBackendLive: boolean;
}

type Action =
  | { type: 'SET_BACKEND_LIVE'; isLive: boolean }
  | { type: 'SYNC_BACKEND_STATE'; payload: Partial<StoreState> }
  | { type: 'START_LOCAL_DEMO' }
  | { type: 'PAUSE_LOCAL_DEMO' }
  | { type: 'RESET_LOCAL_DEMO' }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'SET_CONFIG'; config: Partial<SystemConfiguration> };

const INITIAL_STEP = 120;
const initialMeasurements = getMeasurements(INITIAL_STEP, DEFAULT_CONFIG);
const initialTargets = getMockTargets(initialMeasurements, DEFAULT_CONFIG);

const initialState: StoreState = {
  config: DEFAULT_CONFIG,
  demo: {
    running: false,
    paused: false,
    speed: 1,
    tick: 0,
    surveyStep: INITIAL_STEP,
    totalSurveySteps: DEFAULT_CONFIG.surveyGridSizeX * DEFAULT_CONFIG.surveyGridSizeY,
  },
  surveyStep: INITIAL_STEP,
  measurements: initialMeasurements,
  targets: initialTargets,
  mapCells: getMockMapCells(DEFAULT_CONFIG, initialMeasurements),
  telemetry: getMockTelemetry(initialMeasurements),
  nodes: getMockNodes(DEFAULT_CONFIG),
  detectionResults: getMockDetection(initialMeasurements),
  detectionStatus: getMockDetectionStatus(initialMeasurements, DEFAULT_CONFIG),
  surveyStatus: getMockSurveyStatus(INITIAL_STEP, DEFAULT_CONFIG),
  systemStatus: getMockSystemStatus(),
  securityStatus: {
    totalPacketsVerified: INITIAL_STEP,
    sequenceGaps: 0,
    replayAttemptsBlocked: 0,
    unauthorizedNodesBlocked: 0,
    lastAuditEvent: 'Telemetry verified with HMAC-SHA256 signature.',
    cryptographicIntegrity: 'NOMINAL',
  },
  dataSourceLabel: 'OFFLINE SIMULATION',
  isBackendLive: false,
};

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case 'SET_BACKEND_LIVE':
      return {
        ...state,
        isBackendLive: action.isLive,
        dataSourceLabel: action.isLive ? 'FASTAPI BACKEND (SIMULATION)' : 'OFFLINE SIMULATION',
      };

    case 'SYNC_BACKEND_STATE':
      return {
        ...state,
        ...action.payload,
        demo: {
          ...state.demo,
          running: action.payload.surveyStatus?.state === 'RUNNING',
          paused: action.payload.surveyStatus?.state === 'PAUSED',
          surveyStep: action.payload.surveyStatus?.measurements ?? state.surveyStep,
          totalSurveySteps: state.config.surveyGridSizeX * state.config.surveyGridSizeY,
        },
      };

    case 'START_LOCAL_DEMO':
      return { ...state, demo: { ...state.demo, running: true, paused: false } };

    case 'PAUSE_LOCAL_DEMO':
      return { ...state, demo: { ...state.demo, paused: true } };

    case 'RESET_LOCAL_DEMO':
      return {
        ...state,
        demo: { ...state.demo, running: false, paused: false, surveyStep: 0 },
        surveyStep: 0,
        measurements: [],
        targets: [],
        mapCells: getMockMapCells(state.config, []),
      };

    case 'SET_SPEED':
      return { ...state, demo: { ...state.demo, speed: action.speed } };

    case 'SET_CONFIG': {
      const newConfig = { ...state.config, ...action.config };
      return {
        ...state,
        config: newConfig,
        demo: {
          ...state.demo,
          totalSurveySteps: newConfig.surveyGridSizeX * newConfig.surveyGridSizeY,
        },
      };
    }

    default:
      return state;
  }
}

interface StoreContextType {
  state: StoreState;
  dispatch: React.Dispatch<Action>;
  startDemo: () => Promise<void>;
  pauseDemo: () => Promise<void>;
  resetDemo: () => Promise<void>;
  setSpeed: (s: number) => Promise<void>;
  refreshState: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Sync state from FastAPI backend
  const syncFromBackend = useCallback(async () => {
    try {
      const [
        sysStatus,
        survStatus,
        measList,
        targetsList,
        mapList,
        telemList,
        nodesList,
        detList,
        detStatus,
        secStatus,
      ] = await Promise.all([
        api.getSystemStatus(),
        api.getSurveyStatus(),
        api.getMeasurements(),
        api.getTargets(),
        api.getMapCells(),
        api.getTelemetry(),
        api.getNodes(),
        api.getDetectionResults(),
        api.getDetectionStatus(),
        api.getSecurityStatus(),
      ]);

      dispatch({ type: 'SET_BACKEND_LIVE', isLive: true });
      dispatch({
        type: 'SYNC_BACKEND_STATE',
        payload: {
          systemStatus: sysStatus,
          surveyStatus: survStatus,
          measurements: measList,
          targets: targetsList,
          mapCells: mapList,
          telemetry: telemList,
          nodes: nodesList,
          detectionResults: detList,
          detectionStatus: detStatus,
          securityStatus: secStatus,
          surveyStep: survStatus.measurements,
        },
      });
    } catch (err) {
      dispatch({ type: 'SET_BACKEND_LIVE', isLive: false });
    }
  }, []);

  // Poll FastAPI backend state every 600ms
  useEffect(() => {
    syncFromBackend();
    const interval = setInterval(syncFromBackend, 600);
    return () => clearInterval(interval);
  }, [syncFromBackend]);

  // Demo controls hooked into FastAPI backend
  const startDemo = useCallback(async () => {
    try {
      await api.startSurvey();
      dispatch({ type: 'START_LOCAL_DEMO' });
      await syncFromBackend();
    } catch {
      dispatch({ type: 'START_LOCAL_DEMO' });
    }
  }, [syncFromBackend]);

  const pauseDemo = useCallback(async () => {
    try {
      await api.pauseSurvey();
      dispatch({ type: 'PAUSE_LOCAL_DEMO' });
      await syncFromBackend();
    } catch {
      dispatch({ type: 'PAUSE_LOCAL_DEMO' });
    }
  }, [syncFromBackend]);

  const resetDemo = useCallback(async () => {
    try {
      await api.resetSurvey();
      dispatch({ type: 'RESET_LOCAL_DEMO' });
      await syncFromBackend();
    } catch {
      dispatch({ type: 'RESET_LOCAL_DEMO' });
    }
  }, [syncFromBackend]);

  const setSpeed = useCallback(
    async (s: number) => {
      try {
        await api.setSurveySpeed(s);
        dispatch({ type: 'SET_SPEED', speed: s });
      } catch {
        dispatch({ type: 'SET_SPEED', speed: s });
      }
    },
    []
  );

  return (
    <StoreContext.Provider
      value={{
        state,
        dispatch,
        startDemo,
        pauseDemo,
        resetDemo,
        setSpeed,
        refreshState: syncFromBackend,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
