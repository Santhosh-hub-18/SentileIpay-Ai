import React, { useState } from 'react';
import { X, Play, Sliders, AlertCircle, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client';
import { getRiskTierInfo } from './RiskBadge';
import { useNotification } from '../../context/NotificationContext';

export function TestModeModal({ isOpen, onClose, onEventCreated }) {
  const [score, setScore] = useState(45);
  const [customerName, setCustomerName] = useState('Test Subject Alpha');
  const [amount, setAmount] = useState(250.0);
  const [eventType, setEventType] = useState('PAYMENT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { addToast } = useNotification();

  if (!isOpen) return null;

  const currentTierInfo = getRiskTierInfo(score);

  const quickBoundaries = [
    { label: '0 (Min Normal)', val: 0 },
    { label: '30 (Max Normal)', val: 30 },
    { label: '31 (Min Msg)', val: 31 },
    { label: '50 (Max Msg)', val: 50 },
    { label: '51 (Min OTP)', val: 51 },
    { label: '70 (Max OTP)', val: 70 },
    { label: '71 (Min Call)', val: 71 },
    { label: '90 (Max Call)', val: 90 },
    { label: '91 (Min Block)', val: 91 },
    { label: '100 (Max Block)', val: 100 },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (score < 0 || score > 100) {
      setError('Score must be an integer between 0 and 100.');
      return;
    }

    setLoading(true);
    try {
      const result = await api.testScore({
        score: parseInt(score, 10),
        customer_name: customerName,
        amount: parseFloat(amount),
        event_type: eventType,
      });

      addToast(`Test score ${score} evaluated: ${result.risk_assessment?.risk_level}`, 'success');
      if (onEventCreated) onEventCreated(result);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit test score.');
      addToast(err.message || 'Test evaluation failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-navy-900 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-800 bg-navy-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">Boundary Test Mode Panel</h3>
                <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded">
                  TEST DATA
                </span>
              </div>
              <p className="text-xs text-slate-400">Directly assign a risk score (0–100) to verify tier interventions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Score Slider & Numeric Input */}
          <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-wider font-semibold text-slate-300">
                Direct Assigned Score
              </label>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${currentTierInfo.bg}`}>
                  {currentTierInfo.label}
                </span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="w-16 px-2 py-1 bg-navy-900 border border-navy-700 rounded text-right font-mono font-bold text-white focus:outline-none focus:border-purple-400 text-sm"
                />
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer h-2 bg-navy-800 rounded-lg"
            />

            {/* Quick Boundary Preset Chips */}
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-2 font-medium">
                Exact Boundary Verification Points
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickBoundaries.map((b) => (
                  <button
                    key={b.val}
                    type="button"
                    onClick={() => setScore(b.val)}
                    className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                      score === b.val
                        ? 'bg-purple-600 text-white font-bold'
                        : 'bg-navy-850 hover:bg-navy-800 text-slate-300 border border-navy-750'
                    }`}
                  >
                    {b.val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Test Parameters */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 bg-navy-850 border border-navy-750 rounded-lg text-white focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-navy-850 border border-navy-750 rounded-lg text-white focus:outline-none focus:border-purple-400 font-mono"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-navy-850/50 border border-navy-800 text-[11px] text-slate-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <span>
              This will create an event with exact score <strong className="text-white">{score}</strong>, triggering the exact workflow
              defined for that boundary, labeled as <strong className="text-purple-300">TEST DATA</strong> in the audit logs.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-navy-800 hover:bg-navy-750 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? 'Evaluating...' : 'Dispatch Test Score Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
