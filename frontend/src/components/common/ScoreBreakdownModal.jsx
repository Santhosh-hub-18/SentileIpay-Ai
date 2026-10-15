import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, AlertOctagon, Terminal, User, MapPin, Smartphone, Clock, CreditCard } from 'lucide-react';
import { RiskBadge } from './RiskBadge';
import { StatusBadge } from './StatusBadge';

export function ScoreBreakdownModal({ event, onClose }) {
  const [showRaw, setShowRaw] = useState(false);

  if (!event) return null;

  const ra = event.risk_assessment;
  const breakdown = ra?.criteria_breakdown || [];
  const score = ra?.total_score ?? 0;

  // Meter color
  let progressColor = 'bg-emerald-500';
  if (score > 90) progressColor = 'bg-rose-700';
  else if (score > 70) progressColor = 'bg-rose-500';
  else if (score > 50) progressColor = 'bg-orange-500';
  else if (score > 30) progressColor = 'bg-amber-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-navy-900 border border-navy-750 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-800 bg-navy-850">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-soc-blue/10 border border-soc-blue/20 text-soc-blue">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">Event Evaluation & Score Breakdown</h3>
                {ra?.is_test_data && (
                  <span className="px-2 py-0.5 text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded">
                    TEST DATA
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-slate-400">{event.id} • Customer: {event.customer_name} ({event.customer_id})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Score Banner */}
          <div className="p-5 rounded-xl bg-navy-850 border border-navy-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">Fraud Risk Score</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-extrabold font-mono text-white">{score}</span>
                  <span className="text-sm font-medium text-slate-400">/ 100</span>
                  <div className="ml-3">
                    <RiskBadge score={score} tier={ra?.risk_level} showScore={false} />
                  </div>
                </div>
              </div>
              <div className="md:text-right">
                <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">Recommended Action</div>
                <div className="text-sm font-semibold text-slate-100 mt-1">{ra?.recommended_action || 'Pending'}</div>
                <div className="text-xs text-slate-400 mt-0.5">{ra?.delivery_status}</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 rounded-full bg-navy-950 overflow-hidden border border-navy-800 flex">
              <div
                className={`h-full transition-all duration-500 ${progressColor}`}
                style={{ width: `${Math.max(2, score)}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-2">
              <span>0 Normal</span>
              <span>30 Normal</span>
              <span>31 Message</span>
              <span>50 Message</span>
              <span>51 OTP</span>
              <span>70 OTP</span>
              <span>71 Call</span>
              <span>90 Call</span>
              <span>91 Block</span>
              <span>100</span>
            </div>
          </div>

          {/* Action Message notice if present */}
          {ra?.action_message && (
            <div className="p-4 rounded-lg bg-navy-950 border border-navy-800 flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold text-slate-200">Simulated Action Dispatch: </span>
                <span className="text-slate-300">{ra.action_message}</span>
              </div>
            </div>
          )}

          {/* Event Context Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-navy-850/60 border border-navy-800">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Operation</span>
              </div>
              <div className="font-semibold text-white">{event.event_type} • ${event.amount.toFixed(2)} {event.currency}</div>
            </div>

            <div className="p-3 rounded-lg bg-navy-850/60 border border-navy-800">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>Location</span>
              </div>
              <div className="font-semibold text-white">
                {event.location_city}, {event.location_country}
                {!event.location_known && <span className="ml-1 text-rose-400 font-normal">(Unfamiliar)</span>}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-navy-850/60 border border-navy-800">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Device</span>
              </div>
              <div className="font-semibold text-white truncate" title={event.device_id}>
                {event.device_id}
                {!event.device_known && <span className="ml-1 text-rose-400 font-normal">(Unfamiliar)</span>}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-navy-850/60 border border-navy-800">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Timestamp</span>
              </div>
              <div className="font-semibold text-white">
                {new Date(event.timestamp).toLocaleTimeString()} ({new Date(event.timestamp).toLocaleDateString()})
              </div>
            </div>
          </div>

          {/* 8 Criteria Evaluation Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                Risk Engine Evaluation Breakdown (8 Criteria)
              </h4>
              <span className="text-xs text-slate-400">Total max weight: 100 pts</span>
            </div>

            <div className="border border-navy-800 rounded-xl overflow-hidden bg-navy-850/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-navy-800 bg-navy-850 text-slate-400 font-medium">
                    <th className="py-2.5 px-4">Criterion</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Points Awarded</th>
                    <th className="py-2.5 px-4">Explanation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800/60">
                  {breakdown.map((item, idx) => (
                    <tr
                      key={item.criterion || idx}
                      className={`hover:bg-navy-800/40 transition-colors ${
                        item.triggered ? 'bg-navy-850/60' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-medium text-slate-200">
                        {item.name}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.triggered ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            TRIGGERED
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] text-slate-400 bg-slate-800/50">
                            PASS
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        <span className={item.points > 0 ? 'text-amber-400' : 'text-slate-400'}>
                          +{item.points}
                        </span>
                        <span className="text-slate-500 text-[10px]"> / {item.max_points}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {item.explanation}
                      </td>
                    </tr>
                  ))}
                  {breakdown.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-6 text-center text-slate-400">
                        No criteria breakdown data recorded for this event.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Raw Payload Collapsible */}
          <div className="pt-2">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{showRaw ? 'Hide Raw Event Payload' : 'View Raw Event Payload (JSON)'}</span>
            </button>

            {showRaw && (
              <pre className="mt-2 p-3 rounded-lg bg-navy-950 border border-navy-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
                {JSON.stringify(event, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-navy-800 bg-navy-850 text-xs text-slate-400">
          <span>Configurable demonstration values, not validated fraud predictions</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-navy-750 hover:bg-navy-700 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
