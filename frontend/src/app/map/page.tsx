'use client';
import { useStore } from '@/store';
import { getMapCells } from '@/services/mockData';
import { useMemo, useState } from 'react';

type LayerKey = 'coverage' | 'emAnomaly' | 'magnetic' | 'prospectivity' | 'uncertainty' | 'targets';

const layers: { key: LayerKey; label: string }[] = [
  { key: 'coverage', label: 'Coverage' },
  { key: 'emAnomaly', label: 'EM Anomaly' },
  { key: 'magnetic', label: 'Magnetic' },
  { key: 'prospectivity', label: 'Prospectivity' },
  { key: 'uncertainty', label: 'Uncertainty' },
  { key: 'targets', label: 'Targets' },
];

function valueToColor(value: number | null, layer: LayerKey): string {
  if (value === null) return '#f3f4f6';
  const v = Math.max(0, Math.min(1, value));

  switch (layer) {
    case 'emAnomaly':
      // Blue to red
      if (v < 0.3) return `rgb(${190 + v * 100}, ${210 + v * 50}, 235)`;
      if (v < 0.6) return `rgb(255, ${230 - v * 150}, ${100 - v * 80})`;
      return `rgb(${200 + v * 55}, ${80 - v * 50}, ${50 - v * 30})`;
    case 'magnetic': {
      // Normalize to 0-1 range (45000-55000)
      const norm = value !== null ? (value - 45000) / 10000 : 0;
      const n = Math.max(0, Math.min(1, norm));
      if (n < 0.4) return `rgb(${200 + n * 100}, ${220 + n * 50}, 240)`;
      if (n < 0.6) return `rgb(255, ${240 - n * 100}, ${180 - n * 100})`;
      return `rgb(${180 + n * 75}, ${100 - n * 60}, ${50})`;
    }
    case 'prospectivity':
      if (v < 0.3) return `rgb(220, 230, 240)`;
      if (v < 0.5) return `rgb(255, 240, 180)`;
      if (v < 0.7) return `rgb(255, 190, 100)`;
      return `rgb(220, ${80 - v * 30}, ${50})`;
    case 'uncertainty':
      // Green (low uncertainty) to red (high)
      if (v < 0.2) return `rgb(200, 235, 200)`;
      if (v < 0.4) return `rgb(235, 235, 180)`;
      return `rgb(240, ${180 - v * 80}, ${140 - v * 60})`;
    default:
      return '#dbeafe';
  }
}

export default function MapPage() {
  const { state } = useStore();
  const { config, measurements, mapCells } = state;
  const [activeLayer, setActiveLayer] = useState<LayerKey>('coverage');

  const cells = mapCells && mapCells.length > 0 ? mapCells : getMapCells(config, measurements);

  const gridX = config.surveyGridSizeX;
  const gridY = config.surveyGridSizeY;
  const cellSize = 32;
  const gap = 1;
  const marginLeft = 40;
  const marginTop = 20;
  const marginBottom = 30;
  const marginRight = 20;
  const width = gridX * (cellSize + gap) + marginLeft + marginRight;
  const height = gridY * (cellSize + gap) + marginTop + marginBottom;

  // Build cell map for quick lookup
  const cellMap = useMemo(() => {
    const m = new Map<string, (typeof cells)[0]>();
    for (const c of cells) m.set(`${c.x},${c.y}`, c);
    return m;
  }, [cells]);

  // Current sensor position
  const currentRow = state.surveyStep > 0
    ? Math.floor((state.surveyStep - 1) / gridX)
    : -1;
  const currentColRaw = state.surveyStep > 0
    ? (state.surveyStep - 1) % gridX
    : -1;
  const currentCol = currentRow >= 0
    ? (currentRow % 2 === 0 ? currentColRaw : gridX - 1 - currentColRaw)
    : -1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-navy-900 uppercase tracking-wide">Seafloor Survey Map</h1>
          <span className="text-[0.65rem] text-gray-500 font-mono">
            {gridX}×{gridY} grid • {config.gridSpacing}m spacing • Simulation Data
          </span>
        </div>
      </div>

      {/* Layer controls */}
      <div className="panel">
        <div className="panel-header">Map Layers</div>
        <div className="panel-body flex gap-2">
          {layers.map((l) => (
            <button
              key={l.key}
              onClick={() => setActiveLayer(l.key)}
              className={`btn btn-sm ${activeLayer === l.key ? 'btn-primary' : 'btn-secondary'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="panel">
        <div className="panel-header">
          {layers.find((l) => l.key === activeLayer)?.label} Layer — X/Y Coordinate Grid
        </div>
        <div className="panel-body overflow-auto">
          {measurements.length === 0 ? (
            <div className="text-center text-gray-400 py-10">No survey data. Start the demo to populate the map.</div>
          ) : (
            <>
              <svg width={width} height={height} className="block">
                {/* Axis labels Y */}
                {Array.from({ length: gridY }, (_, row) => (
                  <text key={`y-${row}`} x={marginLeft - 6} y={marginTop + row * (cellSize + gap) + cellSize / 2 + 3}
                    fontSize={8} fill="#9ca3af" textAnchor="end" fontFamily="var(--font-mono)">
                    {row * config.gridSpacing}
                  </text>
                ))}
                {/* Axis labels X */}
                {Array.from({ length: gridX }, (_, col) => (
                  <text key={`x-${col}`} x={marginLeft + col * (cellSize + gap) + cellSize / 2} y={height - 8}
                    fontSize={8} fill="#9ca3af" textAnchor="middle" fontFamily="var(--font-mono)">
                    {col * config.gridSpacing}
                  </text>
                ))}

                {/* Axis titles */}
                <text x={width / 2} y={height - 0} fontSize={9} fill="#6b7280" textAnchor="middle" fontFamily="var(--font-mono)">X (m)</text>
                <text x={8} y={height / 2} fontSize={9} fill="#6b7280" textAnchor="middle" fontFamily="var(--font-mono)" transform={`rotate(-90, 8, ${height / 2})`}>Y (m)</text>

                {/* Grid cells */}
                {Array.from({ length: gridY }, (_, row) =>
                  Array.from({ length: gridX }, (_, col) => {
                    const cell = cellMap.get(`${col},${row}`);
                    const px = marginLeft + col * (cellSize + gap);
                    const py = marginTop + row * (cellSize + gap);

                    let fill = '#f9fafb';
                    let stroke = '#e5e7eb';

                    if (cell) {
                      if (activeLayer === 'coverage') {
                        if (cell.coverage === 'MEASURED') { fill = '#dbeafe'; stroke = '#93c5fd'; }
                        else if (cell.coverage === 'INTERPOLATED') { fill = '#fef3c7'; stroke = '#fbbf24'; }
                        else { fill = '#f9fafb'; stroke = '#e5e7eb'; }
                      } else if (activeLayer === 'targets') {
                        if (cell.hasTarget) { fill = '#fecaca'; stroke = '#f87171'; }
                        else if (cell.coverage === 'MEASURED') { fill = '#e8eaed'; stroke = '#d1d5db'; }
                        else { fill = '#f9fafb'; stroke = '#e5e7eb'; }
                      } else if (cell.coverage !== 'NO_DATA') {
                        let val = cell[activeLayer];
                        if (activeLayer === 'magnetic' && val !== null) {
                          fill = valueToColor(val, 'magnetic');
                        } else {
                          fill = valueToColor(val, activeLayer as LayerKey);
                        }
                        stroke = '#d1d5db';
                      }
                    }

                    const isCurrent = col === currentCol && row === currentRow;

                    return (
                      <g key={`${col}-${row}`}>
                        <rect x={px} y={py} width={cellSize} height={cellSize}
                          fill={fill} stroke={isCurrent ? '#0a1628' : stroke} strokeWidth={isCurrent ? 2 : 0.5} />
                        {cell?.hasTarget && activeLayer === 'targets' && (
                          <circle cx={px + cellSize / 2} cy={py + cellSize / 2} r={5} fill="none" stroke="#b53a2a" strokeWidth={1.5} />
                        )}
                        {isCurrent && (
                          <circle cx={px + cellSize / 2} cy={py + cellSize / 2} r={4} fill="#0a1628" />
                        )}
                      </g>
                    );
                  })
                )}
              </svg>

              {/* Legend */}
              <div className="flex gap-4 mt-3 flex-wrap">
                {activeLayer === 'coverage' && (
                  <>
                    <LegendItem color="#dbeafe" label="MEASURED" border="#93c5fd" />
                    <LegendItem color="#fef3c7" label="INTERPOLATED" border="#fbbf24" />
                    <LegendItem color="#f9fafb" label="NO DATA" border="#e5e7eb" />
                  </>
                )}
                {activeLayer === 'targets' && (
                  <>
                    <LegendItem color="#fecaca" label="Target Cell" border="#f87171" />
                    <LegendItem color="#e8eaed" label="Measured (No Target)" border="#d1d5db" />
                    <LegendItem color="#f9fafb" label="No Data" border="#e5e7eb" />
                  </>
                )}
                {(activeLayer === 'emAnomaly' || activeLayer === 'prospectivity') && (
                  <>
                    <LegendItem color="rgb(220,230,240)" label="Low" border="#d1d5db" />
                    <LegendItem color="rgb(255,190,100)" label="Medium" border="#d1d5db" />
                    <LegendItem color="rgb(220,50,20)" label="High" border="#d1d5db" />
                  </>
                )}
                {activeLayer === 'uncertainty' && (
                  <>
                    <LegendItem color="rgb(200,235,200)" label="Low (Good)" border="#d1d5db" />
                    <LegendItem color="rgb(235,235,180)" label="Medium" border="#d1d5db" />
                    <LegendItem color="rgb(240,100,80)" label="High" border="#d1d5db" />
                  </>
                )}
                <div className="legend-item">
                  <div className="w-3 h-3 rounded-full bg-[#0a1628]" />
                  <span>Current Node</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, border }: { color: string; label: string; border: string }) {
  return (
    <div className="legend-item">
      <div className="legend-swatch" style={{ background: color, borderColor: border }} />
      <span>{label}</span>
    </div>
  );
}
