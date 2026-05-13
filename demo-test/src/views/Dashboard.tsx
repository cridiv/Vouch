import { useState, useEffect, useRef } from 'react';
import { StatCard } from '../components/StatCard';
import { storage } from '../lib/storage';
import type { DeveloperLog, DeveloperStats } from '../lib/types';

export function Dashboard() {
  const [state, setState] = useState({
    apiKey: null as string | null,
    developerId: null as string | null,
    buyerId: null as string | null,
    sellerId: null as string | null,
    agreementId: null as string | null,
    backendUrl: 'http://localhost:5000',
  });
  const [stats, setStats] = useState<DeveloperStats>({
    totalChecksToday: 0,
    redBlocksToday: 0,
    identitiesVerifiedTotal: 0,
    activeAgreements: 0,
    totalEscrowValue: 0,
  });
  const [logs, setLogs] = useState<DeveloperLog[]>([]);
  const [eventFilter, setEventFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [selectedLog, setSelectedLog] = useState<DeveloperLog | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout>();

  const loadStats = async (apiKey: string, backendUrl: string) => {
    try {
      const response = await fetch(`${backendUrl}/v1/developer/stats`, {
        headers: { 'x-api-key': apiKey },
      });
      const data = await response.json();
      setStats(data);
    } catch (err) {
      // Silent fail for stats
    }
  };

  const loadLogs = async (apiKey: string, backendUrl: string) => {
    const url = new URL(`${backendUrl}/v1/developer/logs`);
    url.searchParams.set('limit', '50');
    if (eventFilter) url.searchParams.set('eventType', eventFilter);

    try {
      const response = await fetch(url.toString(), {
        headers: { 'x-api-key': apiKey },
      });
      const data = await response.json();
      setLogs(data.logs || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('Failed to load logs:', err);
    }
  };

  useEffect(() => {
    const allState = storage.getAll();
    setState(allState);

    if (allState.apiKey) {
      loadLogs(allState.apiKey, allState.backendUrl);
      loadStats(allState.apiKey, allState.backendUrl);
    }

    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        const current = storage.getAll();
        setState(current);
        if (current.apiKey) {
          loadLogs(current.apiKey, current.backendUrl);
          loadStats(current.apiKey, current.backendUrl);
        }
      }, 3000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [eventFilter, autoRefresh]);

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const getEventBadgeColor = (eventType: string) => {
    const colors: Record<string, string> = {
      IDENTITY_VERIFIED: 'bg-green-600',
      IDENTITY_FAILED: 'bg-red-600',
      FRAUD_ASSESSED: 'bg-blue-600',
      FRAUD_BLOCKED: 'bg-red-600',
      ESCROW_CREATED: 'bg-purple-600',
      ESCROW_FUNDED: 'bg-green-600',
      ESCROW_FROZEN: 'bg-red-600',
      MILESTONE_CONFIRMED: 'bg-yellow-600',
      DISBURSEMENT_COMPLETED: 'bg-green-600',
    };
    return colors[eventType] || 'bg-gray-600';
  };

  const getFlagColor = (flag?: string) => {
    if (flag === 'GREEN') return 'text-green-400';
    if (flag === 'RED') return 'text-red-400';
    if (flag === 'AMBER') return 'text-yellow-400';
    return 'text-gray-400';
  };

  if (!state.apiKey) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-blue-500 mb-6">
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
          Developer Dashboard — Live Event Log
        </h1>
        <div className="border border-red-600 bg-red-950/30 p-4 rounded text-red-400">
          ❌ No API key. Go to Setup (Page 1) first.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-500 mb-6">
        <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
        Developer Dashboard — Live Event Log
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <StatCard label="Checks Today" value={stats.totalChecksToday} />
        <StatCard label="RED Blocks" value={stats.redBlocksToday} color="red" />
        <StatCard label="Identities Verified" value={stats.identitiesVerifiedTotal} />
        <StatCard label="Active Agreements" value={stats.activeAgreements} />
        <StatCard label="Escrow Value (NGN)" value={stats.totalEscrowValue.toLocaleString()} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-gray-500">Filter:</span>
        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="bg-gray-900 border border-gray-700 px-3 py-1 rounded text-sm font-mono"
        >
          <option value="">All Events</option>
          <option value="FRAUD_BLOCKED">FRAUD_BLOCKED</option>
          <option value="FRAUD_ASSESSED">FRAUD_ASSESSED</option>
          <option value="ESCROW_FROZEN">ESCROW_FROZEN</option>
          <option value="IDENTITY_VERIFIED">IDENTITY_VERIFIED</option>
          <option value="IDENTITY_FAILED">IDENTITY_FAILED</option>
          <option value="ESCROW_CREATED">ESCROW_CREATED</option>
          <option value="ESCROW_FUNDED">ESCROW_FUNDED</option>
          <option value="DISBURSEMENT_COMPLETED">DISBURSEMENT_COMPLETED</option>
        </select>

        <button
          onClick={() => state.apiKey && loadLogs(state.apiKey, state.backendUrl)}
          className="px-4 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm font-mono cursor-pointer"
        >
          ↻ Refresh
        </button>

        <button
          onClick={toggleAutoRefresh}
          className="px-4 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm font-mono cursor-pointer"
        >
          {autoRefresh ? '⏸ Pause' : '▶ Resume'} Auto-refresh
        </button>

        <span className="text-xs text-gray-500 ml-auto">Last updated: {lastUpdated}</span>
      </div>

      {/* Log Table */}
      <div className="border border-gray-800 rounded overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-900">
            <tr>
              <th className="text-left p-3 text-gray-500 font-mono">Time</th>
              <th className="text-left p-3 text-gray-500 font-mono">Event</th>
              <th className="text-left p-3 text-gray-500 font-mono">User</th>
              <th className="text-left p-3 text-gray-500 font-mono">Agreement</th>
              <th className="text-left p-3 text-gray-500 font-mono">Score</th>
              <th className="text-left p-3 text-gray-500 font-mono">Flag</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-500">
                  No logs yet. Run some actions on the other pages.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="border-t border-gray-900 hover:bg-gray-900 cursor-pointer"
                >
                  <td className="p-3 text-gray-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold text-white ${getEventBadgeColor(log.eventType)}`}>
                      {log.eventType}
                    </span>
                  </td>
                  <td className="p-3 text-gray-300">{log.externalUserId || '—'}</td>
                  <td className="p-3 text-gray-500 font-mono text-[10px]">
                    {log.agreementId ? log.agreementId.slice(0, 8) + '...' : '—'}
                  </td>
                  <td className="p-3 text-gray-300">{log.score ?? '—'}</td>
                  <td className="p-3">
                    <span className={`font-bold ${getFlagColor(log.flag)}`}>
                      {log.flag || '—'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Panel */}
      {selectedLog && (
        <div className="mt-6 border border-gray-800 bg-gray-900 p-4 rounded">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-blue-400">Full Payload</h3>
            <button
              onClick={() => setSelectedLog(null)}
              className="text-xs text-gray-500 hover:text-gray-300 cursor-pointer"
            >
              ✕ Close
            </button>
          </div>
          <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono">
            Event:      {selectedLog.eventType}{'\n'}
            Time:       {new Date(selectedLog.createdAt).toLocaleString()}{'\n'}
            User:       {selectedLog.externalUserId || 'N/A'}{'\n'}
            Agreement:  {selectedLog.agreementId || 'N/A'}{'\n'}
            Score:      {selectedLog.score ?? 'N/A'}{'\n'}
            Flag:       {selectedLog.flag || 'N/A'}{'\n'}
            {'\n'}
            ── Full Payload ──────────────────────────{'\n'}
            {JSON.stringify(selectedLog.payload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
