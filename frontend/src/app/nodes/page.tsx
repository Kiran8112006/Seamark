'use client';
import { useStore } from '@/store';

export default function NodesPage() {
  const { state } = useStore();
  const { nodes } = state;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-base font-bold text-navy-900 uppercase tracking-wide">Sensor / Node Status</h1>
        <span className="text-[0.65rem] text-gray-500 font-mono">
          {nodes.filter((n) => n.communication === 'ONLINE').length}/{nodes.length} nodes online • Simulation Data
        </span>
      </div>

      {/* Node table */}
      <div className="panel">
        <div className="panel-header">Node Registry</div>
        <div className="panel-body overflow-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Role</th>
                <th>Position (X, Y, Z)</th>
                <th>Depth (m)</th>
                <th>Battery (%)</th>
                <th>Temp (°C)</th>
                <th>Communication</th>
                <th>Signal Quality</th>
                <th>Sensor Health</th>
                <th>Last Packet</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((n) => (
                <tr key={n.id}>
                  <td className="font-semibold">{n.id}</td>
                  <td>
                    <span className={`status-badge ${n.role === 'REFERENCE' ? 'status-online' : 'bg-navy-50 text-navy-700 border border-navy-200'}`}>
                      {n.role}
                    </span>
                  </td>
                  <td>({n.position.x}, {n.position.y}, {n.position.z})</td>
                  <td>{n.depth}</td>
                  <td>
                    <span className={n.battery < 60 ? 'text-status-amber font-semibold' : ''}>{n.battery.toFixed(1)}</span>
                  </td>
                  <td>{n.temperature.toFixed(1)}</td>
                  <td>
                    <span className={`status-badge status-${n.communication.toLowerCase()}`}>
                      {n.communication}
                    </span>
                  </td>
                  <td>
                    <SignalBar value={n.signalQuality} />
                  </td>
                  <td>
                    <span className={`status-badge ${
                      n.sensorHealth === 'NOMINAL' ? 'status-online' :
                      n.sensorHealth === 'WARNING' ? 'status-warning' :
                      n.sensorHealth === 'DEGRADED' ? 'status-degraded' : 'status-offline'
                    }`}>
                      {n.sensorHealth}
                    </span>
                  </td>
                  <td>{new Date(n.lastPacket).toLocaleTimeString('en-GB', { hour12: false })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Node cards */}
      <div className="grid grid-cols-4 gap-3">
        {nodes.map((n) => (
          <div key={n.id} className="panel">
            <div className="panel-header flex justify-between items-center">
              <span>{n.id} — {n.role}</span>
              <span className={`status-badge ${
                n.communication === 'ONLINE' ? 'status-online' :
                n.communication === 'WARNING' ? 'status-warning' :
                n.communication === 'DEGRADED' ? 'status-degraded' : 'status-offline'
              }`}>
                {n.communication}
              </span>
            </div>
            <div className="panel-body space-y-2">
              <NodeDetail label="Position" value={`(${n.position.x}, ${n.position.y}, ${n.position.z})`} />
              <NodeDetail label="Depth" value={`${n.depth} m`} />
              <NodeDetail label="Battery" value={`${n.battery.toFixed(1)}%`} warn={n.battery < 60} />
              <NodeDetail label="Temperature" value={`${n.temperature.toFixed(1)} °C`} />
              <NodeDetail label="Signal Quality" value={n.signalQuality.toFixed(3)} warn={n.signalQuality < 0.7} />
              <NodeDetail label="Sensor Health" value={n.sensorHealth} warn={n.sensorHealth !== 'NOMINAL'} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NodeDetail({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex justify-between text-[0.75rem]">
      <span className="text-gray-500 text-[0.65rem] uppercase tracking-wider font-semibold">{label}</span>
      <span className={`font-mono font-semibold ${warn ? 'text-status-amber' : 'text-navy-800'}`}>{value}</span>
    </div>
  );
}

function SignalBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-200 rounded-sm overflow-hidden">
        <div
          className={`h-full rounded-sm ${pct > 70 ? 'bg-status-green' : pct > 50 ? 'bg-status-amber' : 'bg-status-red'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[0.65rem] font-mono">{value.toFixed(2)}</span>
    </div>
  );
}
