'use client';
import { useStore } from '@/store';
import { Play, Pause, RotateCcw } from 'lucide-react';

const speeds = [0.5, 1, 2, 5];

export default function DemoControls() {
  const { state, startDemo, pauseDemo, resetDemo, setSpeed } = useStore();
  const { demo, surveyStep } = state;
  const totalSteps = demo.totalSurveySteps;
  const progress = totalSteps > 0 ? Math.round((surveyStep / totalSteps) * 100) : 0;

  return (
    <div className="flex items-center gap-3 bg-navy-800 border border-navy-700 px-3 py-1.5 text-[0.7rem] select-none">
      <span className="text-navy-400 font-semibold uppercase tracking-wider text-[0.6rem]">Demo</span>
      <div className="flex items-center gap-1">
        {!demo.running || demo.paused ? (
          <button
            onClick={startDemo}
            className="btn btn-sm btn-primary flex items-center gap-1"
            aria-label="Start demo"
          >
            <Play size={10} /> Start
          </button>
        ) : (
          <button
            onClick={pauseDemo}
            className="btn btn-sm btn-secondary flex items-center gap-1"
            aria-label="Pause demo"
          >
            <Pause size={10} /> Pause
          </button>
        )}
        <button
          onClick={resetDemo}
          className="btn btn-sm btn-secondary flex items-center gap-1"
          aria-label="Reset demo"
        >
          <RotateCcw size={10} /> Reset
        </button>
      </div>

      <div className="flex items-center gap-1 text-navy-300">
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`px-2 py-0.5 rounded-sm text-[0.65rem] font-mono font-semibold transition-colors
              ${demo.speed === s
                ? 'bg-navy-600 text-white'
                : 'text-navy-400 hover:text-white hover:bg-navy-700'
              }`}
            aria-label={`Set speed to ${s}x`}
          >
            {s}×
          </button>
        ))}
      </div>

      <div className="ml-2 text-navy-400 font-mono">
        Step {surveyStep}/{totalSteps}
      </div>
      <div className="w-24 h-1.5 bg-navy-700 rounded-sm overflow-hidden">
        <div
          className="h-full bg-navy-400 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-navy-400 font-mono">{progress}%</span>
    </div>
  );
}
