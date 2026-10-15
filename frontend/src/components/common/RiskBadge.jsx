import React from 'react';

export function getRiskTierInfo(score, tier) {
  if (tier) {
    switch (tier.toUpperCase()) {
      case 'NORMAL':
        return { label: 'Normal', color: 'emerald', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      case 'SEND_MESSAGE':
        return { label: 'Send Message', color: 'amber', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
      case 'OTP_VERIFICATION':
        return { label: 'OTP Required', color: 'orange', bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30' };
      case 'CALL_VERIFICATION':
        return { label: 'Call Required', color: 'red', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
      case 'TEMPORARY_BLOCK':
        return { label: 'Temp Block', color: 'darkred', bg: 'bg-red-950/80 text-red-300 border-red-700/60' };
      default:
        return { label: tier, color: 'slate', bg: 'bg-slate-700/30 text-slate-300 border-slate-600' };
    }
  }

  if (score <= 30) {
    return { label: 'Normal (0-30)', color: 'emerald', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
  } else if (score <= 50) {
    return { label: 'Medium (31-50)', color: 'amber', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
  } else if (score <= 70) {
    return { label: 'Elevated (51-70)', color: 'orange', bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30' };
  } else if (score <= 90) {
    return { label: 'High (71-90)', color: 'red', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
  } else {
    return { label: 'Critical (91-100)', color: 'darkred', bg: 'bg-red-950/80 text-red-300 border-red-700/60' };
  }
}

export function RiskBadge({ score, tier, showScore = true }) {
  const info = getRiskTierInfo(score, tier);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${info.bg}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {showScore && score !== undefined && (
        <span className="font-mono font-bold">{score}</span>
      )}
      <span>{info.label}</span>
    </span>
  );
}
