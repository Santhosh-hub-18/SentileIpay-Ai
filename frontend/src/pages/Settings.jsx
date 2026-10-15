import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Save,
  AlertTriangle,
  CheckCircle2,
  Lock,
  RotateCcw,
  Sliders,
  Info,
  Layers,
  Sparkles
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { ConfirmationModal } from '../components/common/ConfirmationModal';

export function Settings() {
  const { user, isAdmin } = useAuth();
  const { addToast } = useNotification();

  const [config, setConfig] = useState(null);
  const [weights, setWeights] = useState({});
  const [ranges, setRanges] = useState([]);
  const [otpExpiry, setOtpExpiry] = useState(300);
  const [maxOtpAttempts, setMaxOtpAttempts] = useState(3);
  const [smsTemplate, setSmsTemplate] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clientError, setClientError] = useState(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getSettings();
      setConfig(data);
      setWeights(data.criteria_weights || {});
      setRanges(data.action_ranges || []);
      setOtpExpiry(data.otp_expiry_seconds || 300);
      setMaxOtpAttempts(data.max_otp_attempts || 3);
      setSmsTemplate(data.simulated_sms_template || '');
    } catch (err) {
      console.error('Failed to load settings:', err);
      addToast(err.message || 'Failed to load risk settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Compute live total weights
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + (Number(w) || 0), 0);

  // Validate ranges continuously
  const validateRangesLocally = () => {
    if (ranges.length !== 5) return 'Exactly 5 action ranges must be configured.';
    const sorted = [...ranges].sort((a, b) => a.min_score - b.min_score);

    if (sorted[0].min_score !== 0) {
      return `The first tier must start at 0 (currently ${sorted[0].min_score}).`;
    }
    if (sorted[sorted.length - 1].max_score !== 100) {
      return `The highest tier must end at 100 (currently ${sorted[sorted.length - 1].max_score}).`;
    }

    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      if (r.min_score > r.max_score) {
        return `Range '${r.name}' has minimum ${r.min_score} greater than maximum ${r.max_score}.`;
      }
      if (i > 0) {
        const prev = sorted[i - 1];
        if (r.min_score !== prev.max_score + 1) {
          return `Gap or overlap between '${prev.name}' (ends at ${prev.max_score}) and '${r.name}' (starts at ${r.min_score}). Must be contiguous.`;
        }
      }
    }

    return null;
  };

  const rangeError = validateRangesLocally();

  const handleWeightChange = (key, val) => {
    setWeights((prev) => ({
      ...prev,
      [key]: Math.max(0, Math.min(100, Number(val) || 0)),
    }));
  };

  const handleRangeBoundChange = (index, field, val) => {
    setRanges((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: Math.max(0, Math.min(100, Number(val) || 0)),
      };
      return copy;
    });
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    setClientError(null);

    if (totalWeight !== 100) {
      setClientError(`Criteria weights must sum exactly to 100 (currently ${totalWeight}).`);
      addToast(`Weights sum to ${totalWeight}, expected 100`, 'error');
      return;
    }

    if (rangeError) {
      setClientError(rangeError);
      addToast(rangeError, 'error');
      return;
    }

    setConfirmOpen(true);
  };

  const executeSave = async () => {
    setSaving(true);
    try {
      const payload = {
        label_notice: config?.label_notice || 'Configurable demonstration values, not validated fraud predictions',
        criteria_weights: weights,
        action_ranges: ranges,
        otp_expiry_seconds: Number(otpExpiry),
        max_otp_attempts: Number(maxOtpAttempts),
        simulated_sms_template: smsTemplate,
      };

      const res = await api.updateSettings(payload);
      addToast('Risk configuration successfully updated and live engine synchronized!', 'success');
      setConfig(res);
      setConfirmOpen(false);
      setClientError(null);
    } catch (err) {
      const msg = err.data?.detail || err.message || 'Failed to save settings.';
      setClientError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      addToast('Validation error: ' + (typeof msg === 'string' ? msg : 'Invalid settings'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const criteriaLabels = {
    unusual_amount: { name: '1. Unusual Transaction Amount', max: 'Max Points' },
    unfamiliar_device: { name: '2. Unfamiliar Device Signature', max: 'Max Points' },
    unusual_location: { name: '3. Unusual Geographic Location', max: 'Max Points' },
    repeated_failed_logins: { name: '4. Repeated Failed Login Attempts', max: 'Max Points' },
    high_frequency: { name: '5. High Transaction Velocity', max: 'Max Points' },
    unusual_time: { name: '6. Unusual Transaction Time Window', max: 'Max Points' },
    new_beneficiary: { name: '7. Newly Added Beneficiary', max: 'Max Points' },
    behavioural_anomaly: { name: '8. Behavioural Statistical Anomaly', max: 'Max Points' },
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-mono text-xs">
        Loading system configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-navy-900 border border-navy-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">System Risk Configuration & Scoring Rules</h1>
            <p className="text-xs text-slate-400">
              Configure server-side criteria weights, boundary thresholds, and simulation parameters
            </p>
          </div>
        </div>

        {isAdmin ? (
          <button
            onClick={handleSaveClick}
            disabled={saving || totalWeight !== 100 || !!rangeError}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all disabled:opacity-40 self-start sm:self-auto"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-850 border border-navy-750 text-slate-400 text-xs font-mono">
            <Lock className="w-3.5 h-3.5 text-purple-400" />
            <span>Admin Authorization Required</span>
          </div>
        )}
      </div>

      {/* Demonstration Notice Banner */}
      <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 flex items-start gap-3 text-xs text-slate-300">
        <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white">Required Regulatory Notice: </strong>
          <span className="text-cyan-300 font-medium">
            "{config?.label_notice || 'Configurable demonstration values, not validated fraud predictions'}"
          </span>
          <p className="text-slate-400 mt-1">
            All weights and score boundaries calibrated below operate solely within the hackathon PS-002 demonstration environment.
          </p>
        </div>
      </div>

      {/* Validation Alert if Error */}
      {clientError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <div className="font-bold text-sm">Configuration Validation Error</div>
            <div>{clientError}</div>
          </div>
        </div>
      )}

      {/* Criteria Weights Configuration Box */}
      <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-navy-800 pb-4">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              1. Eight Risk Criteria Point Allocation
            </h3>
            <p className="text-xs text-slate-400">Points assigned when each independent risk indicator is triggered</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Total Points Sum:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                totalWeight === 100
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              {totalWeight} / 100 pts
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(criteriaLabels).map(([key, meta]) => {
            const currentVal = weights[key] ?? 0;
            return (
              <div
                key={key}
                className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">{meta.name}</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      disabled={!isAdmin}
                      value={currentVal}
                      onChange={(e) => handleWeightChange(key, e.target.value)}
                      className="w-16 px-2 py-1 bg-navy-900 border border-navy-700 rounded text-right font-mono font-bold text-cyan-400 focus:outline-none focus:border-purple-400 text-xs disabled:opacity-50"
                    />
                    <span className="text-xs font-mono text-slate-500">pts</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="50"
                  disabled={!isAdmin}
                  value={currentVal}
                  onChange={(e) => handleWeightChange(key, e.target.value)}
                  className="w-full accent-cyan-500 h-1.5 bg-navy-800 rounded-lg cursor-pointer disabled:opacity-50"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Continuous Range Thresholds Configuration */}
      <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-navy-800 pb-4">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              2. Action Ranges & Boundary Thresholds (0–100)
            </h3>
            <p className="text-xs text-slate-400">Must cover 0 to 100 continuously with zero gaps and no overlaps</p>
          </div>

          <div>
            {rangeError ? (
              <span className="px-2.5 py-1 rounded text-[11px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30">
                Range Conflict Detected
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ranges Continuous (0–100)</span>
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {ranges.map((tier, idx) => (
            <div
              key={tier.key || idx}
              className="p-4 rounded-xl bg-navy-950 border border-navy-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-cyan-400 shrink-0"></span>
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">{tier.name}</div>
                  <div className="text-[11px] text-slate-400">{tier.action_label} • {tier.description}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto font-mono text-xs">
                <span className="text-slate-400">Min:</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  disabled={!isAdmin || idx === 0} // 0 is fixed for tier 1
                  value={tier.min_score}
                  onChange={(e) => handleRangeBoundChange(idx, 'min_score', e.target.value)}
                  className="w-16 px-2 py-1 bg-navy-900 border border-navy-700 rounded text-center text-white focus:outline-none focus:border-purple-400 disabled:opacity-50"
                />
                <span className="text-slate-500">—</span>
                <span className="text-slate-400">Max:</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  disabled={!isAdmin || idx === ranges.length - 1} // 100 is fixed for last tier
                  value={tier.max_score}
                  onChange={(e) => handleRangeBoundChange(idx, 'max_score', e.target.value)}
                  className="w-16 px-2 py-1 bg-navy-900 border border-navy-700 rounded text-center text-white focus:outline-none focus:border-purple-400 disabled:opacity-50"
                />
                <span className="text-slate-500">pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* App Simulation Parameters */}
      <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 shadow-xl space-y-4">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider border-b border-navy-800 pb-3">
          3. App Simulation Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Demo OTP Expiry (Seconds)
            </label>
            <input
              type="number"
              min="30"
              max="3600"
              disabled={!isAdmin}
              value={otpExpiry}
              onChange={(e) => setOtpExpiry(Number(e.target.value))}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-750 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-purple-400 disabled:opacity-50"
            />
            <span className="text-[11px] text-slate-500">Default: 300 seconds (5 minutes)</span>
          </div>

          <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Max Failed OTP Attempts (Lockout Limit)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              disabled={!isAdmin}
              value={maxOtpAttempts}
              onChange={(e) => setMaxOtpAttempts(Number(e.target.value))}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-750 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-purple-400 disabled:opacity-50"
            />
            <span className="text-[11px] text-slate-500">Default: 3 attempts before permanent lockout</span>
          </div>

          <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 md:col-span-2 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Simulated Customer Alert Message Template (SMS Simulation)
            </label>
            <textarea
              rows={2}
              disabled={!isAdmin}
              value={smsTemplate}
              onChange={(e) => setSmsTemplate(e.target.value)}
              className="w-full p-3 bg-navy-900 border border-navy-750 rounded-xl text-white text-xs focus:outline-none focus:border-purple-400 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Confirmation Dialog on Save */}
      <ConfirmationModal
        isOpen={confirmOpen}
        title="Commit Risk Configuration Update?"
        message="This will update the scoring criteria weights and boundary ranges across the live scoring engine. An audit log will be created."
        confirmText="Commit Changes"
        confirmColor="purple"
        loading={saving}
        onClose={() => setConfirmOpen(false)}
        onConfirm={executeSave}
      />
    </div>
  );
}
