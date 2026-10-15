import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  Clock,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Lock,
  RefreshCw,
  Info,
  Sparkles
} from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/common/StatusBadge';
import { useNotification } from '../context/NotificationContext';

export function OtpVerification() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [inputCode, setInputCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [requestingNew, setRequestingNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const { addToast } = useNotification();

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await api.listOtpSessions(statusFilter ? { status: statusFilter } : {});
      const items = data.items || [];
      setSessions(items);

      // Default selected session to the first pending or first in list
      if (!selectedSession && items.length > 0) {
        const firstPending = items.find((s) => s.status === 'PENDING') || items[0];
        setSelectedSession(firstPending);
      } else if (selectedSession) {
        // Keep selected session updated with latest server state
        const updated = items.find((s) => s.id === selectedSession.id);
        if (updated) setSelectedSession(updated);
      }
    } catch (err) {
      console.error('Failed to load OTP sessions:', err);
      addToast(err.message || 'Failed to load OTP sessions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!selectedSession || !inputCode.trim()) return;

    setVerifying(true);
    try {
      const res = await api.verifyOtp(selectedSession.event_id, inputCode.trim());
      if (res.success) {
        addToast(res.message, 'success');
      } else {
        addToast(res.message, res.status === 'LOCKED_OUT' ? 'error' : 'warning');
      }
      setInputCode('');
      await fetchSessions();
    } catch (err) {
      addToast(err.message || 'Verification attempt failed', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleRequestNewCode = async () => {
    if (!selectedSession) return;
    setRequestingNew(true);
    try {
      const res = await api.requestOtp(selectedSession.event_id);
      addToast(`New demo OTP code issued for event ${selectedSession.event_id}`, 'success');
      setInputCode('');
      await fetchSessions();
    } catch (err) {
      addToast(err.message || 'Failed to request new code', 'error');
    } finally {
      setRequestingNew(false);
    }
  };

  const handleAutofillDemoCode = () => {
    if (selectedSession?.demo_code_display) {
      setInputCode(selectedSession.demo_code_display);
    }
  };

  const isExpired = selectedSession && new Date(selectedSession.expires_at) < new Date();
  const isLockedOut = selectedSession?.status === 'LOCKED_OUT';
  const isVerified = selectedSession?.status === 'VERIFIED';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-navy-900 border border-navy-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Demo OTP Verification Center</h1>
            <p className="text-xs text-slate-400">
              Interactive simulator for elevated-risk operations (score range 51–70). Only hashes are stored in the database.
            </p>
          </div>
        </div>

        <button
          onClick={fetchSessions}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-navy-850 hover:bg-navy-800 border border-navy-750 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-400' : ''}`} />
          <span>Refresh Sessions</span>
        </button>
      </div>

      {/* Interactive Verification Console */}
      {selectedSession ? (
        <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 shadow-xl space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-navy-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">Active OTP Verification Session</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  Elevated Risk (51–70)
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Session ID: {selectedSession.id} • Event: {selectedSession.event_id} • Customer: {selectedSession.event?.customer_name} ({selectedSession.customer_id})
              </p>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={selectedSession.status} />
              <button
                onClick={handleRequestNewCode}
                disabled={requestingNew}
                className="px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-750 border border-navy-750 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${requestingNew ? 'animate-spin text-orange-400' : ''}`} />
                <span>Re-issue Demo Code</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Box: Clearly Labelled Demo Code Display */}
            <div className="p-5 rounded-xl bg-navy-950 border border-navy-800 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                    Generated Demo Code
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    demo – not production authentication
                  </span>
                </div>

                {/* Display Code */}
                <div className="mt-4 p-4 rounded-xl bg-navy-900 border border-navy-750 text-center">
                  <div className="text-4xl font-extrabold font-mono tracking-widest text-cyan-400 select-all">
                    {selectedSession.demo_code_display}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 font-mono">
                    SHA-256 Hash stored in DB: <span className="text-slate-400 text-[10px] truncate inline-block max-w-[200px] align-bottom">verified</span>
                  </p>
                </div>
              </div>

              {/* Status and Limits */}
              <div className="space-y-2 pt-2 border-t border-navy-850 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Valid Until:</span>
                  </span>
                  <span className={`font-mono ${isExpired ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
                    {new Date(selectedSession.expires_at).toLocaleTimeString()}{' '}
                    {isExpired && '(EXPIRED)'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Attempts Used:</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((dot) => (
                        <span
                          key={dot}
                          className={`w-2.5 h-2.5 rounded-full ${
                            dot <= selectedSession.attempts
                              ? isLockedOut
                                ? 'bg-rose-500'
                                : 'bg-amber-400'
                              : 'bg-navy-800 border border-navy-700'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-mono text-slate-300">
                      {selectedSession.attempts} / {selectedSession.max_attempts}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Box: Interactive Verification Form */}
            <div className="p-5 rounded-xl bg-navy-850/60 border border-navy-800 flex flex-col justify-between space-y-4">
              <div>
                <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-300 mb-1">
                  Customer Code Verification Input
                </h4>
                <p className="text-xs text-slate-400 mb-4">
                  Test OTP code validation logic. Mismatched codes decrement attempts; 3 failed attempts lock out session.
                </p>

                {/* State Banner */}
                {isVerified ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div className="text-xs">
                      <div className="font-bold text-sm">Authentication Confirmed</div>
                      <div>This OTP session has been verified and the associated event has been approved.</div>
                    </div>
                  </div>
                ) : isLockedOut ? (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-3">
                    <Lock className="w-6 h-6 text-rose-400 shrink-0" />
                    <div className="text-xs">
                      <div className="font-bold text-sm">Session Locked Out</div>
                      <div>Maximum verification attempts exceeded (3/3). This transaction is failed for security.</div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleVerify} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-slate-300">Enter 6-Digit Passcode</label>
                        <button
                          type="button"
                          onClick={handleAutofillDemoCode}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Autofill Demo Code</span>
                        </button>
                      </div>

                      <input
                        type="text"
                        maxLength={6}
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full text-center tracking-widest font-mono text-2xl py-3 px-4 bg-navy-950 border border-navy-750 rounded-xl text-white focus:outline-none focus:border-orange-400 transition-colors"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={verifying || inputCode.length !== 6}
                        className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-lg shadow-orange-600/20 transition-all disabled:opacity-40"
                      >
                        {verifying ? 'Validating Hash...' : 'Verify OTP Code'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setInputCode('000000')}
                        className="px-3 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-750 border border-navy-700 text-slate-300 text-xs font-medium"
                        title="Fill incorrect code to test attempt lockout"
                      >
                        Wrong Code
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="text-[11px] text-slate-400 pt-3 border-t border-navy-800">
                Notice: All verification workflows simulate customer SMS delivery. Never use real financial accounts or phone lines.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-navy-900 border border-navy-800 rounded-2xl text-slate-400 text-xs">
          No active OTP sessions found. Use the simulation controls above to ingest a "Suspicious Login" (Score 51–70).
        </div>
      )}

      {/* Sessions History Table */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-navy-800 bg-navy-850 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            All Monitored OTP Sessions ({sessions.length})
          </h3>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-400"
          >
            <option value="">All Session Statuses</option>
            <option value="PENDING">Pending Verification</option>
            <option value="VERIFIED">Verified</option>
            <option value="LOCKED_OUT">Locked Out</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-navy-800 bg-navy-850/40 text-slate-400 font-medium">
                <th className="py-2.5 px-4">Session Ref</th>
                <th className="py-2.5 px-4">Event Ref</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-3 text-center">Demo Code</th>
                <th className="py-2.5 px-3 text-center">Attempts</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Expires</th>
                <th className="py-2.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 font-mono">
              {sessions.map((s) => {
                const isSelected = selectedSession?.id === s.id;
                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedSession(s)}
                    className={`hover:bg-navy-800/50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-orange-500/10' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold text-orange-400">{s.id}</td>
                    <td className="py-3 px-4 text-cyan-400">{s.event_id}</td>
                    <td className="py-3 px-4 font-sans text-white">
                      <div>{s.event?.customer_name || 'Customer'}</div>
                      <div className="text-[10px] text-slate-400">{s.customer_id}</div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-white tracking-widest">
                      {s.demo_code_display}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-300">
                      {s.attempts} / {s.max_attempts}
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {new Date(s.expires_at).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSession(s);
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                          isSelected
                            ? 'bg-orange-600 text-white border-orange-500'
                            : 'bg-navy-800 hover:bg-navy-750 text-slate-300 border-navy-700'
                        }`}
                      >
                        {isSelected ? 'Active' : 'Select'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
