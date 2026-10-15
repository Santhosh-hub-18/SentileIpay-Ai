import React from 'react';
import { Menu, Shield, RefreshCw, ExternalLink, Activity, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function Header({ onOpenMobile, onRefresh, refreshing }) {
  const { user } = useAuth();

  return (
    <header className="h-16 px-4 md:px-6 bg-navy-900 border-b border-navy-800 flex items-center justify-between z-20">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onOpenMobile}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* SOC Engine Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-semibold uppercase tracking-wider">SOC Engine Active</span>
        </div>

        {/* Simulation Notice Tag */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-navy-800 border border-navy-700 text-slate-400 text-xs font-mono">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          <span>Fictional Simulated Environment • PS-002</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg border border-navy-750 bg-navy-850 hover:bg-navy-800 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="Refresh active view"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">Sync Data</span>
          </button>
        )}

        {/* Swagger Docs Link */}
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg border border-navy-750 bg-navy-850 hover:bg-navy-800 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
          title="Open Swagger API Documentation"
        >
          <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">API Docs (/docs)</span>
        </a>

        {/* User Identity Chip */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-navy-800">
          <div className="text-right leading-tight">
            <span className="block text-xs font-semibold text-white">{user?.username}</span>
            <span className="block text-[10px] text-slate-400 font-mono capitalize">{user?.role}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
