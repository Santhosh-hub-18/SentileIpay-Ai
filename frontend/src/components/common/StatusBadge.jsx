import React from 'react';

export function StatusBadge({ status }) {
  if (!status) return null;

  let style = 'bg-slate-800 text-slate-300 border-slate-700';
  const s = status.toUpperCase();

  if (s === 'APPROVED' || s === 'VERIFIED' || s === 'RESOLVED') {
    style = 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60';
  } else if (s === 'NEW' || s === 'PENDING' || s === 'PENDING_OTP' || s === 'PENDING_MANUAL_VERIFICATION') {
    style = 'bg-amber-950/60 text-amber-400 border-amber-800/60';
  } else if (s === 'UNDER_INVESTIGATION' || s === 'FLAGGED_NOTIFIED') {
    style = 'bg-cyan-950/60 text-cyan-400 border-cyan-800/60';
  } else if (s === 'TEMPORARILY_BLOCKED' || s === 'LOCKED_OUT' || s === 'REJECTED') {
    style = 'bg-rose-950/60 text-rose-400 border-rose-800/60';
  } else if (s === 'RELEASED') {
    style = 'bg-blue-950/60 text-blue-400 border-blue-800/60';
  } else if (s === 'TEST_DATA') {
    style = 'bg-purple-950/60 text-purple-400 border-purple-800/60';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${style}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
