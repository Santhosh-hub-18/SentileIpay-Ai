import React from 'react';

export function StatCard({ title, value, icon: Icon, changeText, color = 'blue', onClick }) {
  const colorMap = {
    blue: 'border-blue-500/20 text-blue-400 bg-blue-500/10',
    emerald: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/10',
    amber: 'border-amber-500/20 text-amber-400 bg-amber-500/10',
    orange: 'border-orange-500/20 text-orange-400 bg-orange-500/10',
    red: 'border-rose-500/20 text-rose-400 bg-rose-500/10',
    darkred: 'border-red-900/40 text-red-300 bg-red-950/30',
  };

  const badgeStyle = colorMap[color] || colorMap.blue;

  return (
    <div
      onClick={onClick}
      className={`relative p-5 rounded-xl bg-navy-900 border border-navy-800 transition-all duration-200 hover:border-navy-700 ${
        onClick ? 'cursor-pointer hover:bg-navy-850' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-lg border ${badgeStyle}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-3xl font-bold font-mono tracking-tight text-white">{value}</span>
        {changeText && <span className="text-xs text-slate-400">{changeText}</span>}
      </div>
    </div>
  );
}
