'use client';
import { useStore } from '@/store';
import { getTelemetry } from '@/services/mockData';
import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function TelemetryPage() {
  const { state } = useStore();
  const { measurements, telemetry: storeTelemetry } = state;

  const telemetry = storeTelemetry && storeTelemetry.length > 0 ? storeTelemetry : getTelemetry(measurements);
  const recentTelemetry = telemetry.slice(-50);

  const chartData = useMemo(
    () =>
      recentTelemetry.map((t, i) => ({
        idx: i,
        emAmplitude: parseFloat(t.emAmplitude.toFixed(3)),
        anomalyScore: parseFloat(t.anomalyScore.toFixed(3)),
        magneticField: parseFloat((t.magneticField / 1000).toFixed(2)),
        signalQuality: parseFloat(t.signalQuality.toFixed(3)),
      })),
    [recentTelemetry]
  );

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-base font-bold text-navy-900 uppercase tracking-wide">Live Telemetry</h1>
        <span className="text-[0.65rem] text-gray-500 font-mono">
          {telemetry.length} records • Simulation Data
        </span>
      </div>

      {/* Telemetry Table */}
      <div className="panel">
        <div className="panel-header">Telemetry Stream (Last 30)</div>
        <div className="panel-body overflow-auto" style={{ maxHeight: 340 }}>
          {telemetry.length === 0 ? (
            <div className="text-center text-gray-400 py-6 text-sm">No telemetry data. Start the survey demo to generate data.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Node</th>
                  <th>X</th>
                  <th>Y</th>
                  <th>Depth (m)</th>
                  <th>EM Amp</th>
                  <th>EM Phase (°)</th>
                  <th>Mag (nT)</th>
                  <th>Signal Qual</th>
                  <th>Temp (°C)</th>
                  <th>Battery (%)</th>
                  <th>Anomaly</th>
                </tr>
              </thead>
              <tbody>
                {telemetry.slice(-30).reverse().map((t, i) => (
                  <tr key={i}>
                    <td>{new Date(t.timestamp).toLocaleTimeString('en-GB', { hour12: false })}</td>
                    <td>{t.nodeId}</td>
                    <td>{t.x.toFixed(1)}</td>
                    <td>{t.y.toFixed(1)}</td>
                    <td>{t.depth.toFixed(0)}</td>
                    <td>{t.emAmplitude.toFixed(3)}</td>
                    <td>{t.emPhase.toFixed(1)}</td>
                    <td>{t.magneticField.toFixed(0)}</td>
                    <td>{t.signalQuality.toFixed(3)}</td>
                    <td>{t.temperature.toFixed(1)}</td>
                    <td>{t.battery.toFixed(1)}</td>
                    <td className={t.anomalyScore > 0.6 ? 'text-status-red font-semibold' : ''}>{t.anomalyScore.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-3">
        <TelemetryChart
          title="EM Amplitude"
          data={chartData}
          dataKey="emAmplitude"
          color="#1c3568"
          yLabel="Amplitude"
        />
        <TelemetryChart
          title="Anomaly Score"
          data={chartData}
          dataKey="anomalyScore"
          color="#b53a2a"
          yLabel="Score"
        />
        <TelemetryChart
          title="Magnetic Response"
          data={chartData}
          dataKey="magneticField"
          color="#2d7a3a"
          yLabel="kilo-nT"
        />
        <TelemetryChart
          title="Signal Quality"
          data={chartData}
          dataKey="signalQuality"
          color="#b5851a"
          yLabel="Quality"
        />
      </div>
    </div>
  );
}

function TelemetryChart({
  title,
  data,
  dataKey,
  color,
  yLabel,
}: {
  title: string;
  data: Record<string, number>[];
  dataKey: string;
  color: string;
  yLabel: string;
}) {
  return (
    <div className="panel">
      <div className="panel-header">{title}</div>
      <div className="panel-body" style={{ height: 200 }}>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="idx"
                tick={{ fontSize: 9, fill: '#6b7280' }}
                label={{ value: 'Sample', position: 'insideBottomRight', offset: -5, fontSize: 9, fill: '#9ca3af' }}
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#6b7280' }}
                label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 10, fontSize: 9, fill: '#9ca3af' }}
              />
              <Tooltip
                contentStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)', border: '1px solid #d1d5db', borderRadius: 2 }}
              />
              <Line type="monotone" dataKey={dataKey} stroke={color} dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
