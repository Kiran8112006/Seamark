'use client';
import { useStore } from '@/store';
import { useState } from 'react';

export default function TargetsPage() {
  const { state } = useStore();
  const { targets } = state;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = targets.find((t) => t.id === selectedId) || null;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-base font-bold text-navy-900 uppercase tracking-wide">Target Assessment</h1>
        <span className="text-[0.65rem] text-gray-500 font-mono">
          {targets.length} targets identified • Simulation Data
        </span>
      </div>

      {targets.length === 0 ? (
        <div className="panel">
          <div className="panel-body text-center text-gray-400 py-10">
            No targets identified. Run the survey to generate detection data.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {/* Table */}
          <div className="col-span-2 panel">
            <div className="panel-header">Target Registry</div>
            <div className="panel-body overflow-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Target ID</th>
                    <th>X</th>
                    <th>Y</th>
                    <th>Depth (m)</th>
                    <th>Prospectivity</th>
                    <th>Confidence</th>
                    <th>Uncertainty</th>
                    <th>EM Response</th>
                    <th>Mag Response</th>
                    <th>Signal Qual</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {targets.map((t) => (
                    <tr
                      key={t.id}
                      className={`cursor-pointer ${selectedId === t.id ? 'selected' : ''}`}
                      onClick={() => setSelectedId(t.id)}
                    >
                      <td className="font-semibold">{t.id}</td>
                      <td>{t.x.toFixed(1)}</td>
                      <td>{t.y.toFixed(1)}</td>
                      <td>{t.depth}</td>
                      <td className={t.prospectivity > 0.6 ? 'text-status-red font-semibold' : ''}>{t.prospectivity.toFixed(3)}</td>
                      <td>{t.confidence.toFixed(3)}</td>
                      <td>{t.uncertainty.toFixed(3)}</td>
                      <td>{t.emResponse.toFixed(3)}</td>
                      <td>{t.magneticResponse}</td>
                      <td>{t.signalQuality.toFixed(3)}</td>
                      <td>
                        <span className={`status-badge ${
                          t.status === 'IDENTIFIED' ? 'status-online' :
                          t.status === 'RESURVEY_PENDING' ? 'status-warning' :
                          t.status === 'CONFIRMED' ? 'status-online' : ''
                        }`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail panel */}
          <div className="panel">
            <div className="panel-header">Target Detail</div>
            <div className="panel-body">
              {!selected ? (
                <div className="text-center text-gray-400 py-6 text-sm">Select a target to view details</div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm font-bold text-navy-800">TARGET {selected.id}</div>

                  <div className="space-y-2">
                    <DetailRow label="Position" value={`(${selected.x}, ${selected.y})`} />
                    <DetailRow label="Depth" value={`${selected.depth} m`} />
                    <DetailRow label="Prospectivity" value={selected.prospectivity.toFixed(3)} />
                    <DetailRow label="Confidence" value={selected.confidence.toFixed(3)} />
                    <DetailRow label="Uncertainty" value={selected.uncertainty.toFixed(3)} />
                    <DetailRow label="EM Response" value={selected.emResponse.toFixed(3)} />
                    <DetailRow label="Magnetic Response" value={`${selected.magneticResponse} nT`} />
                    <DetailRow label="Signal Quality" value={selected.signalQuality.toFixed(3)} />
                    <DetailRow label="Status" value={selected.status.replace('_', ' ')} />
                  </div>

                  {/* Evidence */}
                  <div>
                    <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500 mb-1">Evidence</div>
                    <ul className="space-y-1">
                      {selected.evidence.map((e, i) => (
                        <li key={i} className="text-[0.75rem] text-gray-700 flex items-start gap-2">
                          <span className="text-status-green mt-0.5">•</span>
                          {e}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommended action */}
                  <div className="border-t border-gray-200 pt-3">
                    <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500 mb-1">Recommended Action</div>
                    <div className="text-sm font-semibold text-navy-700">{selected.recommendedAction}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-[0.8rem]">
      <span className="text-gray-500 uppercase text-[0.65rem] tracking-wider font-semibold">{label}</span>
      <span className="font-mono font-semibold text-navy-800">{value}</span>
    </div>
  );
}
