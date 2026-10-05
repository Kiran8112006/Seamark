'use client';
import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';

const SensorViewer = dynamic(() => import('@/components/SensorViewer'), { ssr: false });

type ViewMode = 'ASSEMBLY' | 'EXPLODED' | 'CUTAWAY';

const components = [
  { name: 'Pressure Housing', desc: 'Titanium alloy cylinder, rated 6000m depth' },
  { name: 'Electronics Module', desc: 'Signal processing and data acquisition board' },
  { name: 'Non-Magnetic Boom', desc: 'Fiberglass extension for sensor separation' },
  { name: 'EM TX Coil', desc: 'Electromagnetic transmitter coil, multi-frequency' },
  { name: 'EM RX Coil', desc: 'Electromagnetic receiver coil, differential pair' },
  { name: 'Magnetometer', desc: 'Fluxgate magnetometer, 3-axis, 0.5 nT resolution' },
  { name: 'Protective Frame', desc: 'Stainless steel guard frame' },
  { name: 'Stand-Off Feet', desc: 'Adjustable height, anti-sink pads' },
  { name: 'Deployment Point', desc: 'ROV/AUV compatible latching mechanism' },
];

export default function SensorPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('ASSEMBLY');
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-navy-900 uppercase tracking-wide">3D Sensor Model</h1>
          <span className="text-[0.65rem] text-gray-500 font-mono">SEAMARK Seafloor Sensor Assembly — Technical Visualization</span>
        </div>
        <div className="flex gap-2">
          {(['ASSEMBLY', 'EXPLODED', 'CUTAWAY'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`btn btn-sm ${viewMode === mode ? 'btn-primary' : 'btn-secondary'}`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {/* 3D Viewer */}
        <div className="col-span-3 panel">
          <div className="panel-header">Sensor Assembly — {viewMode} View</div>
          <div className="panel-body" style={{ height: 520 }}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full text-gray-400">Loading 3D viewer...</div>
            }>
              <SensorViewer viewMode={viewMode} selectedComponent={selectedComponent} />
            </Suspense>
          </div>
        </div>

        {/* Component list */}
        <div className="panel">
          <div className="panel-header">Components</div>
          <div className="panel-body space-y-1 overflow-y-auto" style={{ maxHeight: 520 }}>
            {components.map((c) => (
              <button
                key={c.name}
                onClick={() => setSelectedComponent(selectedComponent === c.name ? null : c.name)}
                className={`w-full text-left px-3 py-2 text-[0.75rem] border rounded-sm transition-colors
                  ${selectedComponent === c.name
                    ? 'bg-navy-50 border-navy-300 text-navy-800'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <div className="font-semibold">{c.name}</div>
                <div className="text-[0.6rem] text-gray-500 mt-0.5">{c.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
