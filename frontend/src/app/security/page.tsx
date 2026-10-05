'use client';
// ============================================================
// SEAMARK — Cybersecurity & Cryptographic Packet Integrity Console
// SIH 2026 Problem Statement: 26064
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/store';
import { api } from '@/services/api';
import type { SecurityEvent, SecurityStatus } from '@/types';
import { ShieldCheck, ShieldAlert, Key, Radio, AlertTriangle, RefreshCw, Play } from 'lucide-react';

export default function SecurityPage() {
  const { state } = useStore();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [status, setStatus] = useState<SecurityStatus>(state.securityStatus);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const fetchSecurityData = useCallback(async () => {
    try {
      const [secStatus, secEvents] = await Promise.all([
        api.getSecurityStatus(),
        api.getSecurityEvents(),
      ]);
      setStatus(secStatus);
      setEvents(secEvents);
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    fetchSecurityData();
    const id = setInterval(fetchSecurityData, 1000);
    return () => clearInterval(id);
  }, [fetchSecurityData]);

  const handleSimulate = async (type: string, nodeId: string = 'SN-02') => {
    setLoading(true);
    try {
      const res = await api.simulateSecurityEvent(type, nodeId);
      setActionMsg(`Simulated event: ${res.event?.eventType || type}`);
      await fetchSecurityData();
    } catch (err: any) {
      setActionMsg(`Simulation failed: ${err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  const getEventBadge = (type: string, severity: string) => {
    if (type === 'TELEMETRY_VERIFIED') {
      return <span className="badge badge-pass">VERIFIED</span>;
    }
    if (type === 'REPLAY_DETECTED') {
      return <span className="badge badge-fail">REPLAY BLOCKED</span>;
    }
    if (type === 'INVALID_NODE') {
      return <span className="badge badge-fail">ROGUE BLOCKED</span>;
    }
    if (type === 'SEQUENCE_GAP') {
      return <span className="badge badge-marginal">SEQUENCE GAP</span>;
    }
    return <span className="badge bg-navy-700 text-navy-200">{type}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-base font-bold text-navy-900 uppercase tracking-wide">
            Cybersecurity & Cryptographic Integrity
          </h1>
          <span className="text-[0.65rem] text-gray-500 font-mono">
            Acoustic Link Authentication • SIH 26064
          </span>
        </div>
        {actionMsg && (
          <span className="text-[0.65rem] font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            {actionMsg}
          </span>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="panel p-3">
          <div className="text-[0.55rem] text-gray-500 uppercase font-semibold">Integrity Status</div>
          <div className="text-sm font-bold text-emerald-600 font-mono flex items-center gap-1 mt-1">
            <ShieldCheck size={14} /> {status.cryptographicIntegrity}
          </div>
          <div className="text-[0.55rem] text-gray-400 mt-1">HMAC-SHA256 authenticated</div>
        </div>

        <div className="panel p-3">
          <div className="text-[0.55rem] text-gray-500 uppercase font-semibold">Packets Verified</div>
          <div className="text-sm font-bold text-navy-900 font-mono mt-1">
            {status.totalPacketsVerified.toLocaleString()}
          </div>
          <div className="text-[0.55rem] text-gray-400 mt-1">Zero cryptographic mismatches</div>
        </div>

        <div className="panel p-3">
          <div className="text-[0.55rem] text-gray-500 uppercase font-semibold">Sequence Gaps / Loss</div>
          <div className={`text-sm font-bold font-mono mt-1 ${status.sequenceGaps > 0 ? 'text-amber-600' : 'text-gray-700'}`}>
            {status.sequenceGaps}
          </div>
          <div className="text-[0.55rem] text-gray-400 mt-1">Acoustic packet loss drops</div>
        </div>

        <div className="panel p-3">
          <div className="text-[0.55rem] text-gray-500 uppercase font-semibold">Replay Attacks Blocked</div>
          <div className={`text-sm font-bold font-mono mt-1 ${status.replayAttemptsBlocked > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {status.replayAttemptsBlocked}
          </div>
          <div className="text-[0.55rem] text-gray-400 mt-1">Sequence rollback protection</div>
        </div>
      </div>

      {/* Interactive Demonstration Injections */}
      <div className="panel p-3 border-l-4 border-l-navy-600 bg-navy-50/50">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs font-bold text-navy-900">Security Anomaly & Attack Simulation Controls</div>
            <div className="text-[0.6rem] text-gray-500">
              Trigger real-time simulated acoustic security anomalies to demonstrate autonomous defense response
            </div>
          </div>
          <button
            onClick={fetchSecurityData}
            className="btn btn-sm btn-secondary flex items-center gap-1"
          >
            <RefreshCw size={10} /> Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            disabled={loading}
            onClick={() => handleSimulate('REPLAY', 'SN-02')}
            className="btn btn-sm btn-secondary flex items-center gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50"
          >
            <ShieldAlert size={11} className="text-rose-600" /> Inject Acoustic Replay Attack
          </button>
          <button
            disabled={loading}
            onClick={() => handleSimulate('GAP', 'SN-01')}
            className="btn btn-sm btn-secondary flex items-center gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            <AlertTriangle size={11} className="text-amber-600" /> Simulate Packet Sequence Gap
          </button>
          <button
            disabled={loading}
            onClick={() => handleSimulate('UNKNOWN_NODE', 'ROGUE-99')}
            className="btn btn-sm btn-secondary flex items-center gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50"
          >
            <Radio size={11} className="text-rose-600" /> Inject Rogue Node Transmission
          </button>
          <button
            disabled={loading}
            onClick={() => handleSimulate('VERIFY', 'SYSTEM')}
            className="btn btn-sm btn-secondary flex items-center gap-1.5 border-sky-300 text-sky-700 hover:bg-sky-50"
          >
            <Key size={11} className="text-sky-600" /> Re-Verify Node Keyrings
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="panel">
        <div className="panel-header flex items-center justify-between">
          <span>Cryptographic Security Audit Log (Last 40 Events)</span>
          <span className="text-[0.6rem] text-gray-500 font-mono">Real-time Backend Stream</span>
        </div>
        <div className="panel-body p-0 overflow-auto" style={{ maxHeight: 420 }}>
          <table className="data-table w-full">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Event ID</th>
                <th style={{ width: 130 }}>Timestamp</th>
                <th style={{ width: 90 }}>Node ID</th>
                <th style={{ width: 140 }}>Status / Event</th>
                <th style={{ width: 80 }}>Severity</th>
                <th>Cryptographic Audit Description</th>
              </tr>
            </thead>
            <tbody>
              {events.slice().reverse().map((ev) => (
                <tr key={ev.id}>
                  <td className="font-mono text-[0.65rem]">{ev.id}</td>
                  <td className="font-mono text-[0.6rem] text-gray-500">
                    {ev.timestamp.replace('T', ' ').slice(0, 19)}
                  </td>
                  <td className="font-mono font-semibold">{ev.nodeId}</td>
                  <td>{getEventBadge(ev.eventType, ev.severity)}</td>
                  <td>
                    <span
                      className={`text-[0.6rem] font-bold font-mono px-1.5 py-0.5 rounded ${
                        ev.severity === 'ALERT'
                          ? 'bg-rose-100 text-rose-800'
                          : ev.severity === 'WARNING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {ev.severity}
                    </span>
                  </td>
                  <td className="text-gray-700 text-[0.65rem] font-mono">{ev.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
