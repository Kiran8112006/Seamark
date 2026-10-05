'use client';
import { useStore } from '@/store';
import { getDetection } from '@/services/mockData';
import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

export default function DetectionPage() {
  const { state } = useStore();
  const { measurements, detectionResults } = state;
  const detections = detectionResults && detectionResults.length > 0 ? detectionResults : getDetection(measurements);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selected = detections[selectedIdx] || null;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-base font-bold text-navy-900 uppercase tracking-wide">Detection Analysis</h1>
        <span className="text-[0.65rem] text-gray-500 font-mono">
          {detections.length} geophysical anomalies detected • Simulation Data
        </span>
      </div>

      {detections.length === 0 ? (
        <div className="panel">
          <div className="panel-body text-center text-gray-400 py-10">
            No detection data available. Start the survey to acquire measurements.
          </div>
        </div>
      ) : (
        <>
          {/* Detection list */}
          <div className="panel">
            <div className="panel-header">Detected Geophysical Anomalies</div>
            <div className="panel-body overflow-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>X</th>
                    <th>Y</th>
                    <th>Amplitude</th>
                    <th>Phase (°)</th>
                    <th>Background</th>
                    <th>Anomaly Score</th>
                    <th>Prospectivity</th>
                    <th>Confidence</th>
                    <th>Uncertainty</th>
                  </tr>
                </thead>
                <tbody>
                  {detections.map((d, i) => (
                    <tr
                      key={d.id}
                      className={`cursor-pointer ${i === selectedIdx ? 'selected' : ''}`}
                      onClick={() => setSelectedIdx(i)}
                    >
                      <td className="font-semibold">{d.id}</td>
                      <td>{d.x.toFixed(1)}</td>
                      <td>{d.y.toFixed(1)}</td>
                      <td>{d.amplitude.toFixed(3)}</td>
                      <td>{d.phase.toFixed(1)}</td>
                      <td>{d.background.toFixed(3)}</td>
                      <td className={d.anomalyScore > 0.6 ? 'text-status-red font-semibold' : ''}>{d.anomalyScore.toFixed(3)}</td>
                      <td>{d.prospectivity.toFixed(3)}</td>
                      <td>{d.confidence.toFixed(3)}</td>
                      <td>{d.uncertainty.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signal Analysis */}
          {selected && (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-navy-800 uppercase">Signal Analysis — {selected.id}</span>
                <span className="text-[0.65rem] text-gray-500 font-mono">Position ({selected.x}, {selected.y})</span>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-6 gap-2">
                <MetricBox label="Amplitude" value={selected.amplitude.toFixed(3)} />
                <MetricBox label="Phase" value={`${selected.phase.toFixed(1)}°`} />
                <MetricBox label="Background" value={selected.background.toFixed(3)} />
                <MetricBox label="Anomaly Score" value={selected.anomalyScore.toFixed(3)} highlight={selected.anomalyScore > 0.6} />
                <MetricBox label="Prospectivity" value={selected.prospectivity.toFixed(3)} />
                <MetricBox label="Uncertainty" value={selected.uncertainty.toFixed(3)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Raw vs Filtered */}
                <div className="panel">
                  <div className="panel-header">Raw Signal vs Filtered Signal</div>
                  <div className="panel-body" style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={selected.rawSignal.map((v, i) => ({
                          i,
                          raw: parseFloat(v.toFixed(4)),
                          filtered: parseFloat(selected.filteredSignal[i].toFixed(4)),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="i" tick={{ fontSize: 8 }} label={{ value: 'Sample', position: 'insideBottomRight', offset: -5, fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 8 }} label={{ value: 'Signal', angle: -90, position: 'insideLeft', offset: 10, fontSize: 9 }} />
                        <Tooltip contentStyle={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                        <Line type="monotone" dataKey="raw" stroke="#9ca3af" dot={false} strokeWidth={1} name="Raw" />
                        <Line type="monotone" dataKey="filtered" stroke="#1c3568" dot={false} strokeWidth={1.5} name="Filtered" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Frequency Response */}
                <div className="panel">
                  <div className="panel-header">Frequency Response</div>
                  <div className="panel-body" style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={selected.frequencyResponse.map((v, i) => ({
                          freq: i * 50,
                          magnitude: parseFloat(v.toFixed(4)),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="freq" tick={{ fontSize: 8 }} label={{ value: 'Frequency (Hz)', position: 'insideBottomRight', offset: -5, fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 8 }} label={{ value: 'Magnitude', angle: -90, position: 'insideLeft', offset: 10, fontSize: 9 }} />
                        <Tooltip contentStyle={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                        <Area type="monotone" dataKey="magnitude" stroke="#2d7a3a" fill="#d1fae5" strokeWidth={1.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Amplitude envelope */}
                <div className="panel">
                  <div className="panel-header">Signal Amplitude Envelope</div>
                  <div className="panel-body" style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={selected.rawSignal.map((v, i) => ({
                          i,
                          amp: parseFloat(Math.abs(v).toFixed(4)),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="i" tick={{ fontSize: 8 }} />
                        <YAxis tick={{ fontSize: 8 }} label={{ value: 'Amplitude', angle: -90, position: 'insideLeft', offset: 10, fontSize: 9 }} />
                        <Tooltip contentStyle={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                        <Area type="monotone" dataKey="amp" stroke="#b5851a" fill="#fef3c7" strokeWidth={1.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Anomaly score context */}
                <div className="panel">
                  <div className="panel-header">Anomaly Score — All Detections</div>
                  <div className="panel-body" style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={detections.map((d) => ({
                          id: d.id,
                          score: parseFloat(d.anomalyScore.toFixed(3)),
                          prospectivity: parseFloat(d.prospectivity.toFixed(3)),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="id" tick={{ fontSize: 8 }} />
                        <YAxis tick={{ fontSize: 8 }} domain={[0, 1]} />
                        <Tooltip contentStyle={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                        <Line type="monotone" dataKey="score" stroke="#b53a2a" dot={{ r: 3 }} strokeWidth={1.5} name="Anomaly Score" />
                        <Line type="monotone" dataKey="prospectivity" stroke="#1c3568" dot={{ r: 3 }} strokeWidth={1.5} name="Prospectivity" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MetricBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="panel">
      <div className="panel-body text-center">
        <div className={`kpi-value text-sm ${highlight ? 'text-status-red' : ''}`}>{value}</div>
        <div className="kpi-label">{label}</div>
      </div>
    </div>
  );
}
