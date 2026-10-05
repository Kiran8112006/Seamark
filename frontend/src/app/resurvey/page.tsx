'use client';
import { useStore } from '@/store';
import { api } from '@/services/api';
import { getTargets, getResurveyState } from '@/services/mockData';
import { useMemo, useState, useCallback } from 'react';
import type { ResurveyState, Target } from '@/types';
import { Play, ArrowDown } from 'lucide-react';

const phaseLabels: Record<string, string> = {
  INITIAL: 'Initial Survey',
  TARGET_IDENTIFIED: 'Target Region Identified',
  RESURVEY_RECOMMENDED: 'Resurvey Recommended',
  RESURVEY_RUNNING: 'Targeted Survey Running',
  RESURVEY_COMPLETE: 'Updated Assessment Complete',
};

export default function ResurveyPage() {
  const { state, refreshState } = useStore();
  const { targets } = state;
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [resurveyState, setResurveyState] = useState<ResurveyState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectTarget = useCallback((t: Target) => {
    setSelectedTarget(t);
    setResurveyState(getResurveyState(t));
  }, []);

  const handleStartResurvey = useCallback(async () => {
    if (!selectedTarget) return;
    setIsSubmitting(true);
    setResurveyState((prev) => (prev ? { ...prev, phase: 'RESURVEY_RUNNING' } : null));

    try {
      const res = await api.triggerResurvey(selectedTarget);
      setResurveyState(res);
      await refreshState();
    } catch (err) {
      console.error('Failed to trigger resurvey:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedTarget, refreshState]);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-base font-bold text-navy-900 uppercase tracking-wide">Adaptive Resurvey</h1>
        <span className="text-[0.65rem] text-gray-500 font-mono">Targeted resampling for uncertainty reduction • Simulation Data</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Target selection */}
        <div className="panel">
          <div className="panel-header">Select Target for Resurvey</div>
          <div className="panel-body">
            {targets.length === 0 ? (
              <div className="text-center text-gray-400 py-6 text-sm">No targets available. Run the survey first.</div>
            ) : (
              <div className="space-y-1">
                {targets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTarget(t)}
                    className={`w-full text-left px-3 py-2 text-[0.8rem] border rounded-sm transition-colors
                      ${selectedTarget?.id === t.id
                        ? 'bg-navy-50 border-navy-300 text-navy-800'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <div className="font-semibold font-mono">{t.id}</div>
                    <div className="text-[0.65rem] text-gray-500">
                      Prospectivity: {t.prospectivity.toFixed(3)} • Uncertainty: {t.uncertainty.toFixed(3)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Process pipeline */}
        <div className="panel">
          <div className="panel-header">Resurvey Pipeline</div>
          <div className="panel-body flex flex-col items-center gap-0 py-4">
            {['INITIAL', 'TARGET_IDENTIFIED', 'RESURVEY_RECOMMENDED', 'RESURVEY_RUNNING', 'RESURVEY_COMPLETE'].map((phase, i, arr) => {
              const current = resurveyState?.phase;
              const phaseOrder = arr.indexOf(current || '');
              const isCompleted = i < phaseOrder;
              const isActive = phase === current;
              return (
                <div key={phase} className="flex flex-col items-center">
                  <div
                    className={`px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-wider border rounded-sm w-56 text-center
                      ${isActive ? 'bg-navy-700 text-white border-navy-700' :
                        isCompleted ? 'bg-navy-50 text-navy-700 border-navy-300' :
                        'bg-white text-gray-400 border-gray-200'
                      }`}
                  >
                    {phaseLabels[phase]}
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowDown size={14} className={`my-1 ${i < phaseOrder ? 'text-navy-400' : 'text-gray-300'}`} />
                  )}
                </div>
              );
            })}

            {resurveyState && resurveyState.phase === 'TARGET_IDENTIFIED' && (
              <button
                onClick={handleStartResurvey}
                className="btn btn-primary mt-4"
              >
                <Play size={12} /> Start Targeted Resurvey
              </button>
            )}
          </div>
        </div>

        {/* Before/After comparison */}
        <div className="panel">
          <div className="panel-header">Assessment Comparison</div>
          <div className="panel-body">
            {!resurveyState || !selectedTarget ? (
              <div className="text-center text-gray-400 py-6 text-sm">Select a target to begin</div>
            ) : (
              <div className="space-y-3">
                <CompareRow label="Prospectivity" before={resurveyState.before.prospectivity} after={resurveyState.after?.prospectivity ?? null} />
                <CompareRow label="Confidence" before={resurveyState.before.confidence} after={resurveyState.after?.confidence ?? null} improved />
                <CompareRow label="Uncertainty" before={resurveyState.before.uncertainty} after={resurveyState.after?.uncertainty ?? null} lowerBetter />
                <CompareRow label="Measurement Density" before={resurveyState.before.measurementDensity} after={resurveyState.after?.measurementDensity ?? null} improved isInteger />

                {resurveyState.phase === 'RESURVEY_RUNNING' && (
                  <div className="text-center text-amber-600 text-sm font-semibold py-3 loading-pulse">
                    Resurvey in progress...
                  </div>
                )}

                {resurveyState.phase === 'RESURVEY_COMPLETE' && (
                  <div className="border-t border-gray-200 pt-3">
                    <div className="text-[0.7rem] font-semibold uppercase text-status-green mb-1">
                      ✓ Resurvey Complete
                    </div>
                    <div className="text-[0.75rem] text-gray-600">
                      Uncertainty reduced. Confidence improved. Updated assessment available.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareRow({
  label,
  before,
  after,
  improved,
  lowerBetter,
  isInteger,
}: {
  label: string;
  before: number;
  after: number | null;
  improved?: boolean;
  lowerBetter?: boolean;
  isInteger?: boolean;
}) {
  const format = (v: number) => isInteger ? String(v) : v.toFixed(3);
  const showChange = after !== null;
  let changeColor = 'text-gray-500';
  if (showChange) {
    const diff = after - before;
    if (lowerBetter) {
      changeColor = diff < 0 ? 'text-status-green' : 'text-status-red';
    } else {
      changeColor = diff > 0 ? 'text-status-green' : diff < 0 ? 'text-status-red' : 'text-gray-500';
    }
  }

  return (
    <div className="flex justify-between items-center text-[0.8rem] py-1 border-b border-gray-100">
      <span className="text-gray-500 uppercase text-[0.65rem] tracking-wider font-semibold w-36">{label}</span>
      <span className="font-mono text-navy-800">{format(before)}</span>
      {showChange ? (
        <>
          <span className="text-gray-400">→</span>
          <span className={`font-mono font-semibold ${changeColor}`}>{format(after)}</span>
        </>
      ) : (
        <>
          <span className="text-gray-300">→</span>
          <span className="text-gray-300 font-mono">—</span>
        </>
      )}
    </div>
  );
}
