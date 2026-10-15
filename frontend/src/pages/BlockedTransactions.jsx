import React, { useState, useEffect } from 'react';
import {
  Ban,
  ShieldAlert,
  Unlock,
  ArrowUpRight,
  Clock,
  Eye,
  AlertTriangle,
  RefreshCw,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import { RiskBadge } from '../components/common/RiskBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { ScoreBreakdownModal } from '../components/common/ScoreBreakdownModal';
import { useNotification } from '../context/NotificationContext';

export function BlockedTransactions() {
  const [blocks, setBlocks] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected block for review modal
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [actionChoice, setActionChoice] = useState('RELEASE');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Confirmation Modal
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Score breakdown modal
  const [inspectEvent, setInspectEvent] = useState(null);

  const { addToast } = useNotification();

  const fetchBlocks = async () => {
    setLoading(true);
    try {
      const data = await api.listBlocks(statusFilter ? { status_filter: statusFilter } : {});
      setBlocks(data.items || []);
    } catch (err) {
      console.error('Failed to load blocked transactions:', err);
      addToast(err.message || 'Failed to load blocked transactions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks();
  }, [statusFilter]);

  const handleOpenReview = (eventItem, defaultAction = 'RELEASE') => {
    setSelectedEvent(eventItem);
    setActionChoice(defaultAction);
    setReason('');
  };

  const handleConfirmPrompt = () => {
    if (!reason.trim() || reason.trim().length < 5) {
      addToast('A mandatory rationale reason (at least 5 characters) is required to release or escalate a block.', 'error');
      return;
    }
    setConfirmOpen(true);
  };

  const executeBlockDecision = async () => {
    if (!selectedEvent) return;
    setSubmitting(true);
    try {
      await api.submitBlockDecision(selectedEvent.id, {
        action: actionChoice,
        reason: reason.trim(),
      });
      addToast(`Block decision executed: ${actionChoice} for ${selectedEvent.id}`, 'success');
      setConfirmOpen(false);
      setSelectedEvent(null);
      fetchBlocks();
    } catch (err) {
      addToast(err.message || 'Failed to submit block decision', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-navy-900 border border-navy-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-red-950/80 border border-red-700/60 text-red-400">
            <Ban className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Simulated Block Management</h1>
            <p className="text-xs text-slate-400">
              Critical-risk operations (score 91–100) placed under temporary hold. Mandatory rationale required for release.
            </p>
          </div>
        </div>

        <button
          onClick={fetchBlocks}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-navy-850 hover:bg-navy-800 border border-navy-750 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-400' : ''}`} />
          <span>Refresh Blocks</span>
        </button>
      </div>

      {/* Prominent Simulated Hold Notice */}
      <div className="p-4 rounded-xl bg-navy-900 border border-red-900/40 text-xs text-slate-300 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-white">Simulated Account Holding Policy</div>
          <p className="text-slate-400 leading-relaxed">
            Temporary blocks are applied when risk indicators score 91–100. In this demonstration environment,
            no actual banking API rails are accessed and no real cardholder funds are frozen.
          </p>
        </div>
      </div>

      {/* Blocked Events Table Container */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Status Filter Bar */}
        <div className="p-4 border-b border-navy-800 bg-navy-850 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {['TEMPORARILY_BLOCKED', 'RELEASED', 'ESCALATED', ''].map((st) => (
              <button
                key={st || 'all'}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  statusFilter === st
                    ? 'bg-red-800 text-white shadow-md shadow-red-900/40'
                    : 'bg-navy-800 hover:bg-navy-750 text-slate-400 hover:text-slate-200 border border-navy-700'
                }`}
              >
                {st ? st.replace('_', ' ') : 'All Block Records'}
              </button>
            ))}
          </div>

          <div className="text-xs font-mono text-slate-400">
            Total Records: <span className="text-white font-bold">{blocks.length}</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-navy-800 bg-navy-850/40 text-slate-400 font-medium">
                <th className="py-3 px-4">Event Ref</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-3 text-center">Score & Tier</th>
                <th className="py-3 px-3 text-center">Hold Status</th>
                <th className="py-3 px-3">Hold Time</th>
                <th className="py-3 px-4 text-center">Senior Analyst Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400 font-sans">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-red-400" />
                      <span>Loading blocked transactions...</span>
                    </div>
                  </td>
                </tr>
              ) : blocks.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400 font-sans">
                    No blocked transactions found. Use the simulation controls to trigger a "Critical Block" (91–100).
                  </td>
                </tr>
              ) : (
                blocks.map((evt) => {
                  const isBlocked = evt.status === 'TEMPORARILY_BLOCKED';
                  const ra = evt.risk_assessment;
                  return (
                    <tr
                      key={evt.id}
                      className="hover:bg-navy-800/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-red-400 font-semibold">{evt.id}</td>
                      <td className="py-3 px-4 font-sans text-white">
                        <div className="font-medium">{evt.customer_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{evt.customer_id}</div>
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-300">{evt.event_type}</td>
                      <td className="py-3 px-3 text-white font-bold font-mono">
                        ${evt.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-300">
                        {evt.location_city}, {evt.location_country}
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <RiskBadge score={ra?.total_score} tier={ra?.risk_level} />
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <StatusBadge status={evt.status} />
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        {isBlocked ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenReview(evt, 'RELEASE')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 text-[11px] font-semibold transition-colors flex items-center gap-1"
                              title="Release hold after senior security review"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Release</span>
                            </button>
                            <button
                              onClick={() => handleOpenReview(evt, 'ESCALATE')}
                              className="px-2.5 py-1 rounded-lg bg-navy-800 hover:bg-navy-750 text-amber-400 border border-navy-700 text-[11px] font-semibold transition-colors flex items-center gap-1"
                              title="Escalate to fraud operations lead"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span>Escalate</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-slate-400 text-[11px]">Action Completed</span>
                            <button
                              onClick={() => setInspectEvent(evt)}
                              className="p-1 rounded text-slate-400 hover:text-cyan-400"
                              title="Inspect criteria"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* Review & Release Action Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-navy-900 border border-red-900/50 rounded-2xl shadow-2xl p-6 overflow-hidden space-y-5">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">Review Temporarily Blocked Event</h3>
                <p className="text-xs font-mono text-slate-400">{selectedEvent.id} • Customer {selectedEvent.customer_id}</p>
              </div>
              <RiskBadge score={selectedEvent.risk_assessment?.total_score} tier={selectedEvent.risk_assessment?.risk_level} />
            </div>

            {/* Context Box */}
            <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Operation:</span>
                <strong className="text-white">${selectedEvent.amount.toFixed(2)} {selectedEvent.currency} ({selectedEvent.event_type})</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Customer Name:</span>
                <span className="text-white">{selectedEvent.customer_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Target Beneficiary:</span>
                <span className="text-slate-300 font-mono">{selectedEvent.beneficiary_name || 'N/A'}</span>
              </div>
            </div>

            {/* Action Choice */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Senior Review Action
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActionChoice('RELEASE')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                    actionChoice === 'RELEASE'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                      : 'bg-navy-850 hover:bg-navy-800 text-slate-300 border-navy-750'
                  }`}
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Release Hold</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActionChoice('ESCALATE')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                    actionChoice === 'ESCALATE'
                      ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/20'
                      : 'bg-navy-850 hover:bg-navy-800 text-slate-300 border-navy-750'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Escalate to Lead</span>
                </button>
              </div>
            </div>

            {/* Mandatory Reason */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Mandatory Security Justification (<span className="text-red-400 font-mono">min 5 chars</span>)
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="E.g., Senior analyst verified secondary KYC documentation and approved overseas transaction release."
                className="w-full p-3 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-red-400"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-navy-800">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-750 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPrompt}
                className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all ${
                  actionChoice === 'RELEASE'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                }`}
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
        title={`Confirm Hold ${actionChoice}?`}
        message={`Are you sure you want to execute ${actionChoice} for blocked event ${selectedEvent?.id}? A reason has been recorded and an immutable audit entry will be logged.`}
        confirmText={`Confirm ${actionChoice}`}
        confirmColor={actionChoice === 'RELEASE' ? 'emerald' : 'amber'}
        loading={submitting}
        onClose={() => setConfirmOpen(false)}
        onConfirm={executeBlockDecision}
      />

      {/* Criteria Breakdown Modal */}
      {inspectEvent && (
        <ScoreBreakdownModal
          event={inspectEvent}
          onClose={() => setInspectEvent(null)}
        />
      )}
    </div>
  );
}
