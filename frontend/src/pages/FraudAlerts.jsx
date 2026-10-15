import React, { useState, useEffect } from 'react';
import {
  Bell,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Eye,
  Edit3,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertOctagon,
  FileText
} from 'lucide-react';
import { api } from '../api/client';
import { RiskBadge } from '../components/common/RiskBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { ScoreBreakdownModal } from '../components/common/ScoreBreakdownModal';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { useNotification } from '../context/NotificationContext';

export function FraudAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [search, setSearch] = useState('');

  // Selected Alert for Triage Modal
  const [triageAlert, setTriageAlert] = useState(null);
  const [investigationNotes, setInvestigationNotes] = useState('');
  const [savingTriage, setSavingTriage] = useState(false);

  // Score breakdown inspect
  const [inspectEvent, setInspectEvent] = useState(null);

  // Confirmation Modal
  const [confirmData, setConfirmData] = useState(null);

  const { addToast } = useNotification();

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.listAlerts({
        page,
        page_size: pageSize,
        status: statusFilter || undefined,
        risk_level: riskFilter || undefined,
        search: search.trim() || undefined,
      });
      setAlerts(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error('Failed to load alerts:', err);
      addToast(err.message || 'Failed to load alerts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [page, statusFilter, riskFilter]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      fetchAlerts();
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const handleOpenTriage = (alert) => {
    setTriageAlert(alert);
    setInvestigationNotes(alert.notes || '');
  };

  const handleUpdateStatus = (newStatus) => {
    setConfirmData({
      newStatus,
      title: `Update Alert Status to ${newStatus}?`,
      message: `This will mark alert ${triageAlert.id} as ${newStatus} and record an audit log entry.`,
      confirmColor: newStatus === 'RESOLVED' ? 'emerald' : newStatus === 'DISMISSED' ? 'red' : 'blue',
      confirmText: `Set as ${newStatus}`,
    });
  };

  const executeStatusUpdate = async () => {
    if (!triageAlert || !confirmData) return;
    setSavingTriage(true);
    try {
      await api.updateAlert(triageAlert.id, {
        status: confirmData.newStatus,
        notes: investigationNotes,
      });
      addToast(`Alert ${triageAlert.id} updated to ${confirmData.newStatus}`, 'success');
      setConfirmData(null);
      setTriageAlert(null);
      fetchAlerts();
    } catch (err) {
      addToast(err.message || 'Failed to update alert', 'error');
    } finally {
      setSavingTriage(false);
    }
  };

  const handleSaveNotesOnly = async () => {
    if (!triageAlert) return;
    setSavingTriage(true);
    try {
      await api.updateAlert(triageAlert.id, {
        notes: investigationNotes,
      });
      addToast(`Investigation notes saved for alert ${triageAlert.id}`, 'success');
      setTriageAlert(null);
      fetchAlerts();
    } catch (err) {
      addToast(err.message || 'Failed to save notes', 'error');
    } finally {
      setSavingTriage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-navy-900 border border-navy-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-soc-blue/10 border border-soc-blue/20 text-soc-blue">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Fraud Alerts & Investigation Queue</h1>
            <p className="text-xs text-slate-400">Triaged security alerts with automated criteria breakdown and analyst audit trail</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-navy-850 hover:bg-navy-800 border border-navy-750 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Sync Alerts</span>
          </button>
        </div>
      </div>

      {/* Main Alert List Container */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 md:p-5 border-b border-navy-800 bg-navy-850 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name, event ref, alert ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-400"
            >
              <option value="">All Statuses</option>
              <option value="NEW">New Alerts</option>
              <option value="UNDER_INVESTIGATION">Under Investigation</option>
              <option value="RESOLVED">Resolved</option>
              <option value="DISMISSED">Dismissed</option>
            </select>
          </div>

          {/* Risk Level Filter */}
          <div>
            <select
              value={riskFilter}
              onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-400"
            >
              <option value="">All Risk Tiers</option>
              <option value="SEND_MESSAGE">Medium Risk (31-50)</option>
              <option value="OTP_VERIFICATION">Elevated OTP (51-70)</option>
              <option value="CALL_VERIFICATION">High Call (71-90)</option>
              <option value="TEMPORARY_BLOCK">Critical Block (91-100)</option>
            </select>
          </div>
        </div>

        {/* Alerts Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-navy-800 bg-navy-850/40 text-slate-400 font-medium">
                <th className="py-3 px-4">Alert Ref</th>
                <th className="py-3 px-4">Event Ref</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-3 text-center">Score & Tier</th>
                <th className="py-3 px-4">Triggered Criteria</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Created</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2 font-sans">
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Loading fraud alerts...</span>
                    </div>
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 font-sans">
                    No fraud alerts match the selected criteria.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className="hover:bg-navy-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-cyan-400">{alert.id}</td>
                    <td className="py-3 px-4 font-sans">
                      <button
                        onClick={() => setInspectEvent(alert.event)}
                        className="text-slate-300 hover:text-cyan-400 flex items-center gap-1 font-mono group"
                      >
                        <span>{alert.event_id}</span>
                        <Eye className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </td>
                    <td className="py-3 px-4 font-sans text-white">
                      <div>{alert.event?.customer_name || 'Customer'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{alert.event?.customer_id}</div>
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      <RiskBadge score={alert.score} tier={alert.risk_level} />
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {alert.triggered_criteria?.map((c) => (
                          <span
                            key={c.criterion}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-navy-800 text-slate-300 border border-navy-700"
                            title={c.explanation}
                          >
                            {c.name} (+{c.points})
                          </span>
                        ))}
                        {(!alert.triggered_criteria || alert.triggered_criteria.length === 0) && (
                          <span className="text-slate-500 text-[11px]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      <StatusBadge status={alert.status} />
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {new Date(alert.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <button
                        onClick={() => handleOpenTriage(alert)}
                        className="px-3 py-1 rounded-lg bg-navy-800 hover:bg-navy-750 border border-navy-700 hover:border-cyan-500/50 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 mx-auto"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Triage</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-navy-800 bg-navy-850 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div>
            Page <span className="text-white font-bold">{page}</span> of <span className="text-white font-bold">{totalPages}</span> ({total} alerts total)
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

      {/* Alert Triage Modal */}
      {triageAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-navy-900 border border-navy-750 rounded-2xl shadow-2xl p-6 overflow-hidden space-y-5">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">Investigate & Triage Alert</h3>
                <p className="text-xs font-mono text-slate-400">{triageAlert.id} • Event {triageAlert.event_id}</p>
              </div>
              <RiskBadge score={triageAlert.score} tier={triageAlert.risk_level} />
            </div>

            {/* Context Summary */}
            <div className="p-3 rounded-xl bg-navy-950 border border-navy-800 text-xs grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400">Customer:</span>{' '}
                <strong className="text-white">{triageAlert.event?.customer_name}</strong>
              </div>
              <div>
                <span className="text-slate-400">Current Status:</span>{' '}
                <StatusBadge status={triageAlert.status} />
              </div>
              <div>
                <span className="text-slate-400">Amount:</span>{' '}
                <strong className="text-white">${triageAlert.event?.amount.toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-slate-400">Location:</span>{' '}
                <span className="text-white">{triageAlert.event?.location_city}, {triageAlert.event?.location_country}</span>
              </div>
            </div>

            {/* Triggered Criteria */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Triggered Criteria Breakdown
              </label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {triageAlert.triggered_criteria?.map((c) => (
                  <div key={c.criterion} className="p-2.5 rounded-lg bg-navy-850 border border-navy-800 text-xs flex items-start justify-between gap-3">
                    <div>
                      <span className="font-semibold text-white">{c.name}: </span>
                      <span className="text-slate-300">{c.explanation}</span>
                    </div>
                    <span className="font-mono font-bold text-amber-400 shrink-0">+{c.points} pts</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Analyst Investigation Notes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Analyst Investigation Notes
              </label>
              <textarea
                rows={3}
                value={investigationNotes}
                onChange={(e) => setInvestigationNotes(e.target.value)}
                placeholder="Enter investigation observations, customer contact notes, or triage rationale..."
                className="w-full p-3 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Status Change Buttons & Actions */}
            <div className="pt-2 border-t border-navy-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('UNDER_INVESTIGATION')}
                  disabled={savingTriage}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-700/50 text-xs font-medium transition-colors"
                >
                  Mark Under Investigation
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('RESOLVED')}
                  disabled={savingTriage}
                  className="px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 text-xs font-medium transition-colors"
                >
                  Mark Resolved
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('DISMISSED')}
                  disabled={savingTriage}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
                >
                  Dismiss
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTriageAlert(null)}
                  className="px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-750 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotesOnly}
                  disabled={savingTriage}
                  className="px-4 py-1.5 rounded-lg bg-soc-blue hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20"
                >
                  {savingTriage ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmData && (
        <ConfirmationModal
          isOpen={true}
          title={confirmData.title}
          message={confirmData.message}
          confirmText={confirmData.confirmText}
          confirmColor={confirmData.confirmColor}
          loading={savingTriage}
          onClose={() => setConfirmData(null)}
          onConfirm={executeStatusUpdate}
        />
      )}

      {/* Event Details Inspector Modal */}
      {inspectEvent && (
        <ScoreBreakdownModal
          event={inspectEvent}
          onClose={() => setInspectEvent(null)}
        />
      )}
    </div>
  );
}
