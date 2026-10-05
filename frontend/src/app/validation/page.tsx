'use client';
import { getValidation } from '@/services/mockData';
import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';

const categoryOrder = ['Sensing', 'Mapping', 'Detection', 'Resurvey', 'System'];
const categoryLabels: Record<string, string> = {
  Sensing: 'SENSING VALIDATION',
  Mapping: 'MAPPING VALIDATION',
  Detection: 'DETECTION VALIDATION',
  Resurvey: 'RESURVEY VALIDATION',
  System: 'SYSTEM PERFORMANCE',
};

export default function ValidationPage() {
  const results = useMemo(() => getValidation(), []);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof results>();
    for (const r of results) {
      if (!m.has(r.category)) m.set(r.category, []);
      m.get(r.category)!.push(r);
    }
    return m;
  }, [results]);

  const totals = useMemo(() => {
    const pass = results.filter((r) => r.status === 'PASS').length;
    const marginal = results.filter((r) => r.status === 'MARGINAL').length;
    const fail = results.filter((r) => r.status === 'FAIL').length;
    return { pass, marginal, fail, total: results.length };
  }, [results]);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-base font-bold text-navy-900 uppercase tracking-wide">Technical Validation</h1>
        <span className="text-[0.65rem] text-gray-500 font-mono">Prototype validation against design thresholds • Simulation Data</span>
      </div>

      {/* Disclaimer */}
      <div className="panel border-amber-300 bg-amber-50">
        <div className="panel-body flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-[0.75rem] text-amber-800">
            <strong>DEMONSTRATION / SIMULATION DATA</strong> — All validation results are derived from simulated sensor data. These measurements have not been obtained from laboratory testing or field deployment. Do not interpret these results as verified performance specifications.
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <SummaryCard label="Total Metrics" value={String(totals.total)} />
        <SummaryCard label="Pass" value={String(totals.pass)} color="text-status-green" />
        <SummaryCard label="Marginal" value={String(totals.marginal)} color="text-status-amber" />
        <SummaryCard label="Fail" value={String(totals.fail)} color="text-status-red" />
      </div>

      {/* Validation tables by category */}
      {categoryOrder.map((cat) => {
        const items = grouped.get(cat) || [];
        if (items.length === 0) return null;
        return (
          <div key={cat} className="panel">
            <div className="panel-header">{categoryLabels[cat]}</div>
            <div className="panel-body overflow-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Value</th>
                    <th>Unit</th>
                    <th>Threshold</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r, i) => (
                    <tr key={i}>
                      <td className="font-semibold">{r.metric}</td>
                      <td>{String(r.value)}</td>
                      <td>{r.unit}</td>
                      <td>{r.threshold}</td>
                      <td>
                        <span className={`status-badge ${
                          r.status === 'PASS' ? 'status-pass' :
                          r.status === 'MARGINAL' ? 'status-marginal' :
                          r.status === 'FAIL' ? 'status-fail' : ''
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="text-gray-500">{r.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="panel">
      <div className="panel-body text-center">
        <div className={`kpi-value ${color || ''}`}>{value}</div>
        <div className="kpi-label">{label}</div>
      </div>
    </div>
  );
}
