import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Clock,
  User,
  Shield,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Terminal,
  Activity
} from 'lucide-react';
import { api } from '../api/client';
import { useNotification } from '../context/NotificationContext';

export function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [actorSearch, setActorSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');

  // Selected Log for JSON detail inspect
  const [selectedLog, setSelectedLog] = useState(null);

  const { addToast } = useNotification();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.listAuditLogs({
        page,
        page_size: pageSize,
        action_type: actionFilter || undefined,
        actor: actorSearch.trim() || undefined,
        event_id: eventSearch.trim() || undefined,
      });
      setLogs(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      addToast(err.message || 'Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      fetchLogs();
    }, 300);
    return () => clearTimeout(handler);
  }, [actorSearch, eventSearch]);

  const getActionBadgeColor = (type) => {
    switch (type) {
      case 'SCORE_CALCULATED':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'OTP_VERIFIED':
      case 'BLOCK_RELEASED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'OTP_FAILED':
      case 'OTP_LOCKED':
      case 'BLOCK_APPLIED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'MESSAGE_SIMULATED':
      case 'CALL_VERIFICATION_PENDING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'SETTINGS_UPDATED':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-navy-900 border border-navy-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Security Audit Logs & Compliance Trail</h1>
            <p className="text-xs text-slate-400">
              Immutable ledger of all ingested events, score calculations, interventions, and analyst decisions
            </p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-navy-850 hover:bg-navy-800 border border-navy-750 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          <span>Refresh Audit Logs</span>
        </button>
      </div>

      {/* Main Audit Container */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 md:p-5 border-b border-navy-800 bg-navy-850 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Action Type Filter */}
          <div>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs focus:outline-none focus:border-purple-400"
            >
              <option value="">All Action Types</option>
              <option value="EVENT_RECEIVED">EVENT_RECEIVED</option>
              <option value="SCORE_CALCULATED">SCORE_CALCULATED</option>
              <option value="MESSAGE_SIMULATED">MESSAGE_SIMULATED</option>
              <option value="OTP_REQUESTED">OTP_REQUESTED</option>
              <option value="OTP_VERIFIED">OTP_VERIFIED</option>
              <option value="OTP_FAILED">OTP_FAILED</option>
              <option value="OTP_LOCKED">OTP_LOCKED</option>
              <option value="CALL_VERIFICATION_PENDING">CALL_VERIFICATION_PENDING</option>
              <option value="ANALYST_DECISION">ANALYST_DECISION</option>
              <option value="BLOCK_APPLIED">BLOCK_APPLIED</option>
              <option value="BLOCK_RELEASED">BLOCK_RELEASED</option>
              <option value="SETTINGS_UPDATED">SETTINGS_UPDATED</option>
            </select>
          </div>

          {/* Event Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by event ref (e.g. EVT-...)"
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Actor Search */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by actor (e.g. SYSTEM, analyst)"
              value={actorSearch}
              onChange={(e) => setActorSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
            />
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-navy-800 bg-navy-850/40 text-slate-400 font-medium">
                <th className="py-3 px-4">Log ID</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-3">Actor</th>
                <th className="py-3 px-3">Event Ref</th>
                <th className="py-3 px-4">Details Summary</th>
                <th className="py-3 px-4 text-right">Timestamp (UTC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 font-sans">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                      <span>Loading audit trail...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 font-sans">
                    No audit records match the selected filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const badgeColor = getActionBadgeColor(log.action_type);
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-navy-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 text-slate-400">{log.id}</td>
                      <td className="py-3 px-4 font-sans">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${badgeColor}`}>
                          {log.action_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-200">
                        <span className="font-sans font-medium text-white">{log.actor}</span>
                      </td>
                      <td className="py-3 px-3 text-cyan-400">
                        {log.event_id || '—'}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-300 max-w-sm truncate" title={JSON.stringify(log.details)}>
                        {typeof log.details === 'object'
                          ? Object.entries(log.details)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' | ')
                          : String(log.details)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-navy-800 bg-navy-850 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div>
            Page <span className="text-white font-bold">{page}</span> of <span className="text-white font-bold">{totalPages}</span> ({total} entries total)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-navy-750 bg-navy-900 hover:bg-navy-800 text-slate-300 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-navy-750 bg-navy-900 hover:bg-navy-800 text-slate-300 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Log JSON Details Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl bg-navy-900 border border-navy-750 rounded-2xl shadow-2xl p-6 overflow-hidden space-y-4">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Audit Log Entry Details</h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getActionBadgeColor(selectedLog.action_type)}`}>
                {selectedLog.action_type}
              </span>
            </div>

            <div className="text-xs space-y-1.5 font-mono text-slate-300">
              <div>Log ID: <span className="text-white font-bold">{selectedLog.id}</span></div>
              <div>Actor: <span className="text-cyan-400">{selectedLog.actor}</span></div>
              <div>Event: <span className="text-cyan-400">{selectedLog.event_id || 'N/A'}</span></div>
              <div>Timestamp: <span className="text-slate-400">{new Date(selectedLog.timestamp).toISOString()}</span></div>
            </div>

            <pre className="p-4 rounded-xl bg-navy-950 border border-navy-800 font-mono text-xs text-slate-200 overflow-x-auto max-h-64">
              {JSON.stringify(selectedLog.details, null, 2)}
            </pre>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-xl bg-navy-800 hover:bg-navy-750 text-white text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
