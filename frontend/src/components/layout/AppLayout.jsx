import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AlertCircle } from 'lucide-react';

export function AppLayout({ currentPath, onNavigate, onRefresh, refreshing, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-navy-950 overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={onNavigate}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          onOpenMobile={() => setMobileOpen(true)}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />

        {/* Persistent Simulation Notice Banner */}
        <div className="px-4 py-2 bg-navy-900 border-b border-navy-800 flex items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">
              <strong className="text-amber-300">SIMULATED ENVIRONMENT:</strong> All financial events, phone numbers, OTP codes, and transaction holds operate strictly on fictional data. No real banks, SMS rails, or telecom lines are contacted.
            </span>
          </div>
          <span className="hidden xl:inline-block font-mono text-[10px] text-cyan-400 shrink-0">
            PS-002: FinTech & Cybersecurity
          </span>
        </div>

        {/* Scrollable Page Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-navy-950">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
