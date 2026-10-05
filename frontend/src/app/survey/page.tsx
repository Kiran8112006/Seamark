'use client';
import { useStore } from '@/store';
import { api } from '@/services/api';
import { Play, Pause, RotateCcw, Target, Download } from 'lucide-react';
import { useMemo } from 'react';

export default function SurveyPage() {
  const { state, startDemo, pauseDemo, resetDemo } = useStore();
  const { config, measurements, surveyStatus, surveyStep } = state;
  const totalCells = config.surveyGridSizeX * config.surveyGridSizeY;

  // Anomaly zones for visualization
  const anomalyZones = useMemo(() => [
    { cx: 8, cy: 6, r: 3 },
    { cx: 14, cy: 10, r: 2.5 },
    { cx: 4, cy: 12, r: 2 },
  ], []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-navy-900 uppercase tracking-wide">Survey Operations</h1>
          <span className="text-[0.65rem] text-gray-500 font-mono">{surveyStatus.surveyId} • {surveyStatus.state}</span>
        </div>
        <div className="flex items-center gap-2">
          {!state.demo.running || state.demo.paused ? (
            <button onClick={startDemo} className="btn btn-primary"><Play size={12} /> Start Survey</button>
          ) : (
            <button onClick={pauseDemo} className="btn btn-secondary"><Pause size={12} /> Pause</button>
          )}
          <button onClick={resetDemo} className="btn btn-secondary"><RotateCcw size={12} /> Reset</button>
          <a href="/resurvey" className="btn btn-secondary flex items-center gap-1"><Target size={12} /> Resurvey Target</a>
          <a href={api.getExportCsvUrl()} download="seamark_survey_export.csv" className="btn btn-secondary flex items-center gap-1"><Download size={12} /> Export CSV</a>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-6 gap-2">
        <StatBox label="State" value={surveyStatus.state} />
        <StatBox label="Progress" value={`${surveyStatus.progress}%`} />
        <StatBox label="Measurements" value={String(surveyStatus.measurements)} />
        <StatBox label="Area Covered" value={`${surveyStatus.areaCovered} m²`} />
        <StatBox label="Position" value={`(${surveyStatus.currentPosition.x}, ${surveyStatus.currentPosition.y})`} />
        <StatBox label="Elapsed" value={formatTime(surveyStatus.elapsedTime)} />
      </div>

      {/* Main survey grid */}
      <div className="panel">
        <div className="panel-header">Survey Grid — Boustrophedon Path</div>
        <div className="panel-body overflow-auto">
          <SurveyGrid
            gridX={config.surveyGridSizeX}
            gridY={config.surveyGridSizeY}
            completedSteps={surveyStep}
            totalCells={totalCells}
            measurements={measurements}
            anomalyZones={anomalyZones}
            anomalyThreshold={config.anomalyThreshold}
          />
        </div>
      </div>

      {/* Recent measurements table */}
      <div className="panel">
        <div className="panel-header">Recent Measurements (Last 10)</div>
        <div className="panel-body overflow-auto">
          {measurements.length === 0 ? (
            <div className="text-center text-gray-400 py-6 text-sm">No measurements yet. Start survey to begin data acquisition.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>X</th>
                  <th>Y</th>
                  <th>Depth (m)</th>
                  <th>EM Amp</th>
                  <th>EM Phase (°)</th>
                  <th>Mag (nT)</th>
                  <th>Anomaly</th>
                  <th>Prospectivity</th>
                  <th>Node</th>
                </tr>
              </thead>
              <tbody>
                {measurements.slice(-10).reverse().map((m) => (
                  <tr key={m.id}>
                    <td>{m.id}</td>
                    <td>{m.x.toFixed(1)}</td>
                    <td>{m.y.toFixed(1)}</td>
                    <td>{m.depth.toFixed(0)}</td>
                    <td>{m.emAmplitude.toFixed(3)}</td>
                    <td>{m.emPhase.toFixed(1)}</td>
                    <td>{m.magneticField.toFixed(0)}</td>
                    <td className={m.anomalyScore > 0.6 ? 'text-status-red font-semibold' : ''}>{m.anomalyScore.toFixed(3)}</td>
                    <td>{m.prospectivity.toFixed(3)}</td>
                    <td>{m.nodeId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel">
      <div className="panel-body text-center">
        <div className="kpi-value text-sm">{value}</div>
        <div className="kpi-label">{label}</div>
      </div>
    </div>
  );
}

function SurveyGrid({
  gridX,
  gridY,
  completedSteps,
  totalCells,
  measurements,
  anomalyZones,
  anomalyThreshold,
}: {
  gridX: number;
  gridY: number;
  completedSteps: number;
  totalCells: number;
  measurements: { x: number; y: number; anomalyScore: number }[];
  anomalyZones: { cx: number; cy: number; r: number }[];
  anomalyThreshold: number;
}) {
  const cellSize = 28;
  const gap = 2;
  const marginLeft = 35;
  const marginTop = 15;
  const marginBottom = 25;
  const width = gridX * (cellSize + gap) + marginLeft + 10;
  const height = gridY * (cellSize + gap) + marginTop + marginBottom;

  // Build measurement lookup
  const measMap = new Map<string, number>();
  for (const m of measurements) {
    const col = Math.round(m.x / 5);
    const row = Math.round(m.y / 5);
    measMap.set(`${col},${row}`, m.anomalyScore);
  }

  // Path line
  const pathPoints: { x: number; y: number }[] = [];
  for (let i = 0; i < completedSteps && i < totalCells; i++) {
    const row = Math.floor(i / gridX);
    const colRaw = i % gridX;
    const col = row % 2 === 0 ? colRaw : gridX - 1 - colRaw;
    pathPoints.push({
      x: marginLeft + col * (cellSize + gap) + cellSize / 2,
      y: marginTop + row * (cellSize + gap) + cellSize / 2,
    });
  }

  const pathD = pathPoints.length > 1
    ? `M ${pathPoints.map((p) => `${p.x},${p.y}`).join(' L ')}`
    : '';

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="block">
        {/* Y axis labels */}
        {Array.from({ length: gridY }, (_, row) => (
          <text
            key={`y-${row}`}
            x={marginLeft - 6}
            y={marginTop + row * (cellSize + gap) + cellSize / 2 + 3}
            fontSize={8}
            fill="#9ca3af"
            textAnchor="end"
            fontFamily="var(--font-mono)"
          >
            {row * 5}
          </text>
        ))}

        {/* X axis labels */}
        {Array.from({ length: gridX }, (_, col) => (
          <text
            key={`x-${col}`}
            x={marginLeft + col * (cellSize + gap) + cellSize / 2}
            y={height - 5}
            fontSize={8}
            fill="#9ca3af"
            textAnchor="middle"
            fontFamily="var(--font-mono)"
          >
            {col * 5}
          </text>
        ))}

        {/* Grid cells */}
        {Array.from({ length: gridY }, (_, row) =>
          Array.from({ length: gridX }, (_, col) => {
            const idx = row * gridX + (row % 2 === 0 ? col : gridX - 1 - col);
            const px = marginLeft + col * (cellSize + gap);
            const py = marginTop + row * (cellSize + gap);

            let fill = '#f9fafb';
            let stroke = '#e5e7eb';

            if (idx < completedSteps) {
              const anom = measMap.get(`${col},${row}`) || 0;
              if (anom > anomalyThreshold) {
                fill = '#fecaca'; // anomaly
                stroke = '#f87171';
              } else if (anom > 0.3) {
                fill = '#fef3c7'; // moderate
                stroke = '#fbbf24';
              } else {
                fill = '#dbeafe'; // normal
                stroke = '#93c5fd';
              }
            }

            const isCurrent = idx === completedSteps - 1 && completedSteps > 0;

            return (
              <g key={`${col}-${row}`}>
                <rect
                  x={px}
                  y={py}
                  width={cellSize}
                  height={cellSize}
                  fill={fill}
                  stroke={isCurrent ? '#1c3568' : stroke}
                  strokeWidth={isCurrent ? 2 : 0.5}
                />
                {isCurrent && (
                  <circle
                    cx={px + cellSize / 2}
                    cy={py + cellSize / 2}
                    r={4}
                    fill="#1c3568"
                  />
                )}
              </g>
            );
          })
        )}

        {/* Anomaly zone outlines */}
        {anomalyZones.map((z, i) => (
          <ellipse
            key={i}
            cx={marginLeft + z.cx * (cellSize + gap) + cellSize / 2}
            cy={marginTop + z.cy * (cellSize + gap) + cellSize / 2}
            rx={z.r * (cellSize + gap)}
            ry={z.r * (cellSize + gap)}
            fill="none"
            stroke="#ef4444"
            strokeWidth={1}
            strokeDasharray="4,3"
            opacity={0.5}
          />
        ))}

        {/* Path line */}
        {pathD && (
          <path d={pathD} fill="none" stroke="#1c3568" strokeWidth={1} opacity={0.3} />
        )}
      </svg>

      <div className="flex gap-4 mt-2">
        <div className="legend-item"><div className="legend-swatch" style={{ background: '#dbeafe', borderColor: '#93c5fd' }} /><span>Normal</span></div>
        <div className="legend-item"><div className="legend-swatch" style={{ background: '#fef3c7', borderColor: '#fbbf24' }} /><span>Moderate</span></div>
        <div className="legend-item"><div className="legend-swatch" style={{ background: '#fecaca', borderColor: '#f87171' }} /><span>Anomaly</span></div>
        <div className="legend-item"><div className="legend-swatch" style={{ background: '#f9fafb', borderColor: '#e5e7eb' }} /><span>No Data</span></div>
        <div className="legend-item"><div className="legend-swatch" style={{ background: '#1c3568' }} /><span>Current Sensor</span></div>
        <div className="legend-item flex items-center gap-1">
          <svg width={16} height={12}><ellipse cx={8} cy={6} rx={7} ry={5} fill="none" stroke="#ef4444" strokeWidth={1} strokeDasharray="3,2" /></svg>
          <span>Target Region</span>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
