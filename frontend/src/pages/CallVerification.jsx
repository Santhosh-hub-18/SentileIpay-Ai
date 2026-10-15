import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  ShieldCheck,
  ArrowUpRight,
  UserX,
  Phone,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  FileText
} from 'lucide-react';
import { api } from '../api/client';
import { RiskBadge } from '../components/common/RiskBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { ScoreBreakdownModal } from '../components/common/ScoreBreakdownModal';
import { useNotification } from '../context/NotificationContext';

export function CallVerification() {
  const [cases, setCases] = useState([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);

  // Selected case for decision modal
  const [selectedCase, setSelectedCase] = useState(null);
  const [decisionAction, setDecisionAction] = useState('VERIFIED');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Confirmation Modal
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Inspect Event Modal
  const [inspectEvent, setInspectEvent] = useState(null);

  const { addToast } = useNotification();

  const fetchCases = async () => {
    setLoading(true);
    try {
      const data = await api.listCases(statusFilter ? { status: statusFilter } : {});
      setCases(data.items || []);
    } catch (err) {
      console.error('Failed to load call verification cases:', err);
      addToast(err.message || 'Failed to load call cases', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [statusFilter]);

  const handleOpenDecision = (caseItem, action) => {
    setSelectedCase(caseItem);
    setDecisionAction(action);
    setDecisionNotes('');
  };

  const handleConfirmPrompt = () => {
    if (!decisionNotes.trim() || decisionNotes.trim().length < 5) {
      addToast('Mandatory analyst justification notes (at least 5 characters) are required.', 'error');
      return;
    }
    setConfirmOpen(true);
  };

  const executeDecision = async () => {
    if (!selectedCase) return;
    setSubmitting(true);
    try {
      await api.submitCaseDecision(selectedCase.id, {
        action: decisionAction,
        notes: decisionNotes.trim(),
      });
      addToast(`Case ${selectedCase.id} updated: ${decisionAction}`, 'success');
      setConfirmOpen(false);
      setSelectedCase(null);
      fetchCases();
    } catch (err) {
      addToast(err.message || 'Failed to submit case decision', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-navy-900 border border-navy-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Manual Call Verification Queue</h1>
            <p className="text-xs text-slate-400">
              High-risk tier operations (score 71–90) requiring SOC telephone checklist verification
            </p>
          </div>
        </div>

        <button
          onClick={fetchCases}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-navy-850 hover:bg-navy-800 border border-navy-750 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-rose-400' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Main Cases Container */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Status Selector Bar */}
        <div className="p-4 border-b border-navy-800 bg-navy-850 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {['PENDING', 'VERIFIED', 'ESCALATED', 'REJECTED', ''].map((st) => (
              <button
                key={st || 'all'}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  statusFilter === st
                    ? 'bg-soc-blue text-white shadow-md shadow-blue-500/20'
                    : 'bg-navy-800 hover:bg-navy-750 text-slate-400 hover:text-slate-200 border border-navy-700'
                }`}
              >
                {st ? st.replace('_', ' ') : 'All Cases'}
              </button>
            ))}
          </div>

          <div className="text-xs font-mono text-slate-400">
            Total Cases: <span className="text-white font-bold">{cases.length}</span>
          </div>
        </div>

        {/* Cases Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-navy-800 bg-navy-850/40 text-slate-400 font-medium">
                <th className="py-3 px-4">Case ID</th>
                <th className="py-3 px-4">Event Ref</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Simulated Phone</th>
                <th className="py-3 px-4">Trigger Rationale</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Created</th>
                <th className="py-3 px-4 text-center">Analyst Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 font-sans">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-rose-400" />
                      <span>Loading verification cases...</span>
                    </div>
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 font-sans">
                    No cases match the selected status filter. Use the simulation controls to generate a "High-Risk Payment" (71–90).
                  </td>
                </tr>
              ) : (
                cases.map((c) => {
                  const isPending = c.status === 'PENDING';
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-navy-800/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-rose-400">{c.id}</td>
                      <td className="py-3 px-4 font-sans">
                        <button
                          onClick={() => setInspectEvent(c.event)}
                          className="text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 group"
                        >
                          <span>{c.event_id}</span>
                          <Eye className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" />
                        </button>
                      </td>
                      <td className="py-3 px-4 font-sans text-white">
                        <div className="font-medium">{c.event?.customer_name || 'Customer'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{c.event?.customer_id}</div>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <div className="flex items-center gap-1.5 text-slate-200">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>{c.simulated_phone}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">Simulated line</div>
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-300 max-w-xs truncate" title={c.reason}>
                        {c.reason}
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {new Date(c.created_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        {isPending ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenDecision(c, 'VERIFIED')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/50 text-[11px] font-semibold transition-colors flex items-center gap-1"
                              title="Customer confirmed identity via simulated call"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verify</span>
                            </button>
                            <button
                              onClick={() => handleOpenDecision(c, 'ESCALATE')}
                              className="px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 text-amber-400 border border-amber-800/50 text-[11px] font-semibold transition-colors flex items-center gap-1"
                              title="Escalate to fraud investigation unit"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span>Escalate</span>
                            </button>
                            <button
                              onClick={() => handleOpenDecision(c, 'REJECTED')}
                              className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-400 border border-rose-800/50 text-[11px] font-semibold transition-colors flex items-center gap-1"
                              title="Reject operation due to suspected fraud"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Resolved</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision Input Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-navy-900 border border-navy-750 rounded-2xl shadow-2xl p-6 overflow-hidden space-y-5">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">Execute Call Verification Decision</h3>
                <p className="text-xs font-mono text-slate-400">{selectedCase.id} • Event {selectedCase.event_id}</p>
              </div>
              <StatusBadge status={selectedCase.status} />
            </div>

            {/* Simulated Call Checklist Banner */}
            <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Customer Name:</span>
                <strong className="text-white">{selectedCase.event?.customer_name}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Simulated Telephone:</span>
                <span className="font-mono text-cyan-400">{selectedCase.simulated_phone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Operation Amount:</span>
                <strong className="text-white">${selectedCase.event?.amount.toFixed(2)}</strong>
              </div>
            </div>

            {/* Action Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Select Analyst Decision
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDecisionAction('VERIFIED')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                    decisionAction === 'VERIFIED'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-navy-850 hover:bg-navy-800 text-slate-300 border-navy-750'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verify</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDecisionAction('ESCALATED')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                    decisionAction === 'ESCALATED'
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-navy-850 hover:bg-navy-800 text-slate-300 border-navy-750'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Escalate</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDecisionAction('REJECTED')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                    decisionAction === 'REJECTED'
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-navy-850 hover:bg-navy-800 text-slate-300 border-navy-750'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              </div>
            </div>

            {/* Mandatory Notes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Mandatory Analyst Checklist Notes (<span className="text-cyan-400 font-mono">min 5 chars</span>)
              </label>
              <textarea
                rows={3}
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="E.g., Customer confirmed high-value transfer over verified phone line after answering identity security questions."
                className="w-full p-3 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-rose-400"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-navy-800">
              <button
                type="button"
                onClick={() => setSelectedCase(null)}
                className="px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-750 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPrompt}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20"
              >
                Proceed to Confirmation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationModal
        isOpen={confirmOpen}
        title={`Confirm Decision: ${decisionAction}?`}
        message={`Are you sure you want to mark case ${selectedCase?.id} as ${decisionAction}? This decision will be stamped with your analyst credentials and logged immutably.`}
        confirmText={`Confirm ${decisionAction}`}
        confirmColor={decisionAction === 'VERIFIED' ? 'emerald' : decisionAction === 'ESCALATED' ? 'amber' : 'red'}
        loading={submitting}
        onClose={() => setConfirmOpen(false)}
        onConfirm={executeDecision}
      />

      {/* Event Details Modal */}
      {inspectEvent && (
        <ScoreBreakdownModal
          event={inspectEvent}
          onClose={() => setInspectEvent(null)}
        />
      )}
    </div>
  );
}
