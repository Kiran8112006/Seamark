'use client';
import { useStore } from '@/store';
import { Activity, Radio, Cpu, Clock, Hash, Maximize2, BarChart3, MapPin, AlertTriangle, Target, TrendingUp, HelpCircle } from 'lucide-react';

const pipelineSteps = ['SURVEY', 'ACQUIRE', 'PROCESS', 'DETECT', 'MAP', 'RANK', 'RESURVEY'];

function getPipelineActiveIndex(surveyStep: number, totalSteps: number): number {
  if (surveyStep === 0) return -1;
  const ratio = surveyStep / totalSteps;
  if (ratio < 0.1) return 0;
  if (ratio < 0.3) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.7) return 3;
  if (ratio < 0.85) return 4;
  if (ratio < 1) return 5;
  return 6;
}

export default function OverviewPage() {
  const { state } = useStore();
  const { config, surveyStep, measurements, systemStatus, surveyStatus, detectionStatus, targets, nodes } = state;

  const totalSteps = config.surveyGridSizeX * config.surveyGridSizeY;
  const activeIdx = getPipelineActiveIndex(surveyStep, totalSteps);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <h1 className="text-base font-bold text-navy-900 uppercase tracking-wide">Mission Overview</h1>
        <span className="text-[0.65rem] text-gray-500 font-mono">SVY-2026-001 • Simulation Data</span>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-3">
        {/* System Status */}
        <div className="panel">
          <div className="panel-header">System Status</div>
          <div className="panel-body grid grid-cols-2 gap-3">
            <KPI icon={<Activity size={12} />} label="Operational" value={systemStatus.operational ? 'YES' : 'NO'} color={systemStatus.operational ? 'text-status-green' : 'text-status-red'} />
            <KPI icon={<Radio size={12} />} label="Telemetry" value={systemStatus.telemetryActive ? 'ACTIVE' : 'INACTIVE'} color={systemStatus.telemetryActive ? 'text-status-green' : 'text-status-red'} />
            <KPI icon={<Cpu size={12} />} label="Nodes Online" value={`${systemStatus.nodesOnline}/${systemStatus.totalNodes}`} />
            <KPI icon={<Clock size={12} />} label="Last Measurement" value={surveyStep > 0 ? `Step ${surveyStep}` : '—'} />
          </div>
        </div>

        {/* Survey Status */}
        <div className="panel">
          <div className="panel-header">Survey Status</div>
          <div className="panel-body grid grid-cols-2 gap-3">
            <KPI icon={<Hash size={12} />} label="Survey ID" value={surveyStatus.surveyId} />
            <KPI icon={<TrendingUp size={12} />} label="Progress" value={`${surveyStatus.progress}%`} />
            <KPI icon={<Maximize2 size={12} />} label="Area Covered" value={`${surveyStatus.areaCovered}`} unit="m²" />
            <KPI icon={<BarChart3 size={12} />} label="Measurements" value={String(surveyStatus.measurements)} />
            <KPI icon={<MapPin size={12} />} label="Position" value={`(${surveyStatus.currentPosition.x}, ${surveyStatus.currentPosition.y})`} />
          </div>
        </div>

        {/* Detection Status */}
        <div className="panel">
          <div className="panel-header">Detection Status</div>
          <div className="panel-body grid grid-cols-2 gap-3">
            <KPI icon={<AlertTriangle size={12} />} label="Anomalies" value={String(detectionStatus.anomalies)} />
            <KPI icon={<TrendingUp size={12} />} label="High Prospectivity" value={String(detectionStatus.highProspectivityAreas)} />
            <KPI icon={<Target size={12} />} label="Targets" value={String(detectionStatus.targets)} />
            <KPI icon={<BarChart3 size={12} />} label="Highest Prospectivity" value={detectionStatus.highestProspectivity.toFixed(3)} />
            <KPI icon={<HelpCircle size={12} />} label="Mean Uncertainty" value={detectionStatus.meanUncertainty.toFixed(3)} />
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div className="panel">
        <div className="panel-header">Engineering Process Pipeline</div>
        <div className="panel-body">
          <div className="pipeline flex-wrap">
            {pipelineSteps.map((step, i) => (
              <div key={step} className="pipeline-step">
                <div
                  className={`pipeline-box ${
                    i < activeIdx ? 'completed' : i === activeIdx ? 'active' : ''
                  }`}
                >
                  {step}
                </div>
                {i < pipelineSteps.length - 1 && <span className="pipeline-arrow">→</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Survey Grid Quick View */}
      <div className="panel">
        <div className="panel-header">Survey Grid — Quick View</div>
        <div className="panel-body">
          <SurveyMiniGrid
            gridX={config.surveyGridSizeX}
            gridY={config.surveyGridSizeY}
            completedSteps={surveyStep}
          />
        </div>
      </div>
    </div>
  );
}

function KPI({
  icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  color?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-navy-400 mt-0.5">{icon}</div>
      <div>
        <div className={`kpi-value text-sm ${color || ''}`}>
          {value}
          {unit && <span className="kpi-unit">{unit}</span>}
        </div>
        <div className="kpi-label">{label}</div>
      </div>
    </div>
  );
}

function SurveyMiniGrid({
  gridX,
  gridY,
  completedSteps,
}: {
  gridX: number;
  gridY: number;
  completedSteps: number;
}) {
  const cellSize = 18;
  const gap = 2;
  const width = gridX * (cellSize + gap) + 40;
  const height = gridY * (cellSize + gap) + 30;

  const cells: { x: number; y: number; idx: number }[] = [];
  for (let row = 0; row < gridY; row++) {
    for (let col = 0; col < gridX; col++) {
      const actualCol = row % 2 === 0 ? col : gridX - 1 - col;
      const idx = row * gridX + col;
      cells.push({ x: actualCol, y: row, idx });
    }
  }

  const currentStep = completedSteps > 0 ? completedSteps - 1 : -1;

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="block">
        {/* Axis labels */}
        <text x={20} y={height - 5} fontSize={9} fill="#6b7280" fontFamily="var(--font-mono)">X →</text>
        <text x={5} y={15} fontSize={9} fill="#6b7280" fontFamily="var(--font-mono)" transform={`rotate(-90, 5, 15)`}>Y ↑</text>

        {cells.map(({ x, y, idx }) => {
          const px = 30 + x * (cellSize + gap);
          const py = 10 + y * (cellSize + gap);
          let fill = '#f3f4f6'; // NO_DATA
          if (idx < completedSteps) fill = '#c7d2fe'; // completed
          if (idx === currentStep) fill = '#1c3568'; // current

          return (
            <rect
              key={`${x}-${y}`}
              x={px}
              y={py}
              width={cellSize}
              height={cellSize}
              fill={fill}
              stroke="#d1d5db"
              strokeWidth={0.5}
            />
          );
        })}
      </svg>
      <div className="flex gap-4 mt-2">
        <div className="legend-item">
          <div className="legend-swatch" style={{ background: '#c7d2fe' }} />
          <span>Completed</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch" style={{ background: '#1c3568' }} />
          <span>Current</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch" style={{ background: '#f3f4f6' }} />
          <span>Pending</span>
        </div>
      </div>
    </div>
  );
}
