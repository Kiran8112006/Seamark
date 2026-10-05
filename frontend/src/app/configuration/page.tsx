'use client';
import { useStore } from '@/store';
import { useState, useCallback } from 'react';
import type { SystemConfiguration } from '@/types';
import { Save, RotateCcw } from 'lucide-react';
import { DEFAULT_CONFIG } from '@/services/mockData';

interface FieldDef {
  key: keyof SystemConfiguration;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  description: string;
}

const fields: FieldDef[] = [
  { key: 'emFrequency', label: 'EM Frequency', unit: 'Hz', min: 500, max: 10000, step: 100, description: 'Electromagnetic transmitter operating frequency' },
  { key: 'surveyGridSizeX', label: 'Grid Size X', unit: 'cells', min: 5, max: 50, step: 1, description: 'Number of grid columns in survey area' },
  { key: 'surveyGridSizeY', label: 'Grid Size Y', unit: 'cells', min: 5, max: 50, step: 1, description: 'Number of grid rows in survey area' },
  { key: 'gridSpacing', label: 'Grid Spacing', unit: 'm', min: 1, max: 20, step: 0.5, description: 'Distance between adjacent measurement points' },
  { key: 'nodeCount', label: 'Node Count', unit: 'nodes', min: 2, max: 10, step: 1, description: 'Total number of sensor nodes in network' },
  { key: 'anomalyThreshold', label: 'Anomaly Threshold', unit: '', min: 0.1, max: 0.9, step: 0.05, description: 'Anomaly score cutoff for target identification' },
  { key: 'prospectivityThreshold', label: 'Prospectivity Threshold', unit: '', min: 0.1, max: 0.9, step: 0.05, description: 'Minimum prospectivity for high-interest classification' },
  { key: 'resurveyThreshold', label: 'Resurvey Threshold', unit: '', min: 0.1, max: 0.9, step: 0.05, description: 'Prospectivity level triggering resurvey recommendation' },
  { key: 'simulationSpeed', label: 'Simulation Speed', unit: '×', min: 0.25, max: 10, step: 0.25, description: 'Demo simulation tick rate multiplier' },
];

export default function ConfigurationPage() {
  const { state, dispatch } = useStore();
  const { config } = state;

  const [localConfig, setLocalConfig] = useState<SystemConfiguration>({ ...config });
  const [saved, setSaved] = useState(false);

  const handleChange = useCallback((key: keyof SystemConfiguration, value: number) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  const handleSave = useCallback(() => {
    dispatch({ type: 'SET_CONFIG', config: localConfig });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [dispatch, localConfig]);

  const handleReset = useCallback(() => {
    setLocalConfig({ ...DEFAULT_CONFIG });
    dispatch({ type: 'SET_CONFIG', config: DEFAULT_CONFIG });
    setSaved(false);
  }, [dispatch]);

  const hasChanges = JSON.stringify(localConfig) !== JSON.stringify(config);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-navy-900 uppercase tracking-wide">System Configuration</h1>
          <span className="text-[0.65rem] text-gray-500 font-mono">Simulation parameters — changes apply to demo mode</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="btn btn-secondary"
          >
            <RotateCcw size={12} /> Reset Defaults
          </button>
          <button
            onClick={handleSave}
            className={`btn ${hasChanges ? 'btn-primary' : 'btn-secondary'}`}
            disabled={!hasChanges}
          >
            <Save size={12} /> Apply Configuration
          </button>
          {saved && (
            <span className="text-status-green text-[0.75rem] font-semibold flex items-center">✓ Applied</span>
          )}
        </div>
      </div>

      {/* Configuration Form */}
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.key} className="panel">
            <div className="panel-body">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor={f.key} className="form-label mb-0">
                  {f.label}
                  {f.unit && <span className="text-gray-400 ml-1">({f.unit})</span>}
                </label>
                <span className="font-mono font-semibold text-navy-800 text-sm">
                  {localConfig[f.key]}
                </span>
              </div>
              <input
                id={f.key}
                type="range"
                min={f.min}
                max={f.max}
                step={f.step}
                value={localConfig[f.key]}
                onChange={(e) => handleChange(f.key, parseFloat(e.target.value))}
                className="w-full accent-navy-700"
              />
              <div className="flex justify-between text-[0.6rem] text-gray-400 font-mono mt-0.5">
                <span>{f.min}</span>
                <span>{f.max}</span>
              </div>
              <div className="text-[0.65rem] text-gray-500 mt-1">{f.description}</div>

              {/* Also allow direct input */}
              <div className="mt-2">
                <input
                  type="number"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={localConfig[f.key]}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v) && v >= f.min && v <= f.max) {
                      handleChange(f.key, v);
                    }
                  }}
                  className="form-input w-28"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Current effective config summary */}
      <div className="panel">
        <div className="panel-header">Active Configuration Summary</div>
        <div className="panel-body overflow-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Current Value</th>
                <th>Default Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => {
                const current = config[f.key];
                const def = DEFAULT_CONFIG[f.key];
                const modified = current !== def;
                return (
                  <tr key={f.key}>
                    <td>{f.label}</td>
                    <td className="font-semibold">{current} {f.unit}</td>
                    <td className="text-gray-400">{def} {f.unit}</td>
                    <td>
                      <span className={`status-badge ${modified ? 'status-warning' : 'status-online'}`}>
                        {modified ? 'MODIFIED' : 'DEFAULT'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
