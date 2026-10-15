import React from 'react';
import {
  LayoutDashboard,
  Activity,
  ShieldAlert,
  KeyRound,
  PhoneCall,
  Ban,
  FileText,
  Settings,
  LogOut,
  Shield,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function Sidebar({ currentPath, onNavigate, collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const { user, logout, isAdmin } = useAuth();

  const navItems = [
    { path: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: 'monitoring', label: 'Live Monitoring', icon: Activity },
    { path: 'alerts', label: 'Fraud Alerts', icon: ShieldAlert },
    { path: 'otp', label: 'OTP Verification', icon: KeyRound },
    { path: 'call-cases', label: 'Call Verification', icon: PhoneCall },
    { path: 'blocks', label: 'Blocked Accounts', icon: Ban },
    { path: 'audit', label: 'Audit Logs', icon: FileText },
    { path: 'settings', label: 'System Settings', icon: Settings, adminOnly: true },
  ];

  const handleNavClick = (path) => {
    onNavigate(path);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-navy-900 border-r border-navy-800 text-slate-300">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-navy-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="leading-tight truncate">
              <span className="font-extrabold tracking-tight text-white text-base">FraudShield</span>
              <span className="block text-[10px] font-mono text-cyan-400 uppercase tracking-widest">SOC Engine v1.0</span>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          const Icon = item.icon;
          const isActive = currentPath === item.path;

          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-soc-blue/15 text-cyan-400 border border-soc-blue/30 shadow-sm shadow-soc-blue/10'
                  : 'hover:bg-navy-800 text-slate-400 hover:text-slate-200'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.adminOnly && (
                <span className="ml-auto text-[9px] uppercase px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                  Admin
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Card & Logout */}
      <div className="p-3 border-t border-navy-800 bg-navy-950/60">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-navy-800 border border-navy-700 flex items-center justify-center text-cyan-400 shrink-0 font-bold text-xs">
              {user?.username?.substring(0, 2).toUpperCase() || 'AN'}
            </div>
            {!collapsed && (
              <div className="overflow-hidden leading-tight">
                <div className="text-xs font-bold text-white truncate">{user?.full_name || user?.username}</div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-purple-400' : 'bg-emerald-400'}`}></span>
                  <span className="uppercase">{user?.role || 'analyst'}</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-navy-800 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block transition-all duration-300 ease-in-out shrink-0 z-30 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/80 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
        ></div>
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 md:hidden transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}
