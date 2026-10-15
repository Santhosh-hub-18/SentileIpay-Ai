import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  UserX,
  PhoneCall,
  Dices,
  Sliders,
  Loader2,
  Sparkles
} from 'lucide-react';
import { api } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import { TestModeModal } from '../common/TestModeModal';

export function EventGeneratorBar({ onEventGenerated }) {
  const [loadingScenario, setLoadingScenario] = useState(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const { addToast } = useNotification();

  const handleSimulate = async (scenario, label) => {
    setLoadingScenario(scenario);
    try {
      const result = await api.simulateEvent(scenario);
      addToast(`Generated ${label}: Score ${result.risk_assessment?.total_score} (${result.risk_assessment?.risk_level})`, 'success');
      if (onEventGenerated) onEventGenerated(result);
    } catch (err) {
      addToast(err.message || 'Simulation failed', 'error');
    } finally {
      setLoadingScenario(null);
    }
  };

  const simulationPresets = [
    {
      id: 'normal',
      label: 'Normal Transaction',
      tier: '0-30 Low',
      color: 'hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-300',
      icon: ShieldCheck,
    },
    {
      id: 'suspicious_tx',
      label: 'Suspicious Transaction',
      tier: '31-50 Medium',
      color: 'hover:border-amber-500/50 hover:bg-amber-500/10 text-amber-300',
      icon: AlertTriangle,
    },
    {
      id: 'suspicious_login',
      label: 'Suspicious Login',
      tier: '51-70 Elevated OTP',
      color: 'hover:border-orange-500/50 hover:bg-orange-500/10 text-orange-300',
      icon: UserX,
    },
    {
      id: 'high_risk_payment',
      label: 'High-Risk Payment',
      tier: '71-90 High Call',
      color: 'hover:border-rose-500/50 hover:bg-rose-500/10 text-rose-300',
      icon: PhoneCall,
    },
    {
      id: 'random',
      label: 'Random Event',
      tier: 'Random Tier',
      color: 'hover:border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-300',
      icon: Dices,
    },
  ];

  return (
    <>
      <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Live Event Simulation Controls
            </span>
            <span className="hidden sm:inline-block text-[11px] text-slate-500">
              (Triggers real-time server scoring & risk interventions)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {simulationPresets.map((preset) => {
              const Icon = preset.icon;
              const isLoading = loadingScenario === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSimulate(preset.id, preset.label)}
                  disabled={loadingScenario !== null}
                  className={`px-3 py-1.5 rounded-lg border border-navy-750 bg-navy-850 text-xs font-medium transition-all duration-150 flex items-center gap-1.5 disabled:opacity-50 ${preset.color}`}
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
                  ) : (
                    <Icon className="w-3.5 h-3.5 text-current" />
                  )}
                  <span>{preset.label}</span>
                </button>
              );
            })}

            <div className="h-5 w-px bg-navy-750 mx-1 hidden sm:block"></div>

            {/* Test Mode Button */}
            <button
              onClick={() => setTestModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg border border-purple-500/40 bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 shadow-sm shadow-purple-500/20"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              <span>Test Mode (0–100)</span>
            </button>
          </div>
        </div>
      </div>

      <TestModeModal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        onEventCreated={onEventGenerated}
      />
    </>
  );
}
