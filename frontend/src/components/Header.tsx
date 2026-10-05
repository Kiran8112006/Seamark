import { useEffect, useState } from 'react';
import { Activity, Clock, Server, AlertCircle } from 'lucide-react';
import { useStore } from '@/store';

export default function Header() {
  const [time, setTime] = useState('');
  const { state } = useStore();
  const { isBackendLive, dataSourceLabel } = state;

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-GB', { hour12: false }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex items-center justify-between bg-navy-900 text-white px-4 py-2 border-b border-navy-700 select-none"
      style={{ minHeight: 48 }}>
      {/* Left — Title */}
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold tracking-widest">SEAMARK</span>
            <span className="text-[0.6rem] font-medium text-navy-300 tracking-wide uppercase">
              Seafloor Mineral Reconnaissance System
            </span>
          </div>
          <div className="text-[0.55rem] text-navy-400 uppercase tracking-wider font-medium">
            SIH 2026 Problem Statement 26064
          </div>
        </div>
      </div>

      {/* Right — Status bar */}
      <div className="flex items-center gap-6 text-[0.65rem] font-mono">
        <StatusItem
          label="BACKEND ENGINE"
          value={isBackendLive ? 'FASTAPI LIVE' : 'DISCONNECTED'}
          color={isBackendLive ? 'text-emerald-400' : 'text-rose-400'}
          icon={isBackendLive ? <Server size={10} /> : <AlertCircle size={10} />}
        />
        <StatusItem
          label="DATA SOURCE"
          value={dataSourceLabel}
          color={isBackendLive ? 'text-emerald-400' : 'text-amber-400 font-bold'}
        />
        <StatusItem label="SYSTEM MODE" value="PROTOTYPE" color="text-sky-400" />
        <div className="flex items-center gap-1 text-navy-300">
          <Clock size={10} />
          <span>{time || '--:--:--'}</span>
        </div>
      </div>
    </header>
  );
}

function StatusItem({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start">
      <span className="text-[0.5rem] text-navy-500 tracking-wider">{label}</span>
      <span className={`font-semibold flex items-center gap-1 ${color || 'text-navy-200'}`}>
        {icon}{value}
      </span>
    </div>
  );
}
