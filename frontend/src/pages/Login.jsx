import React, { useState } from 'react';
import { Shield, Lock, User, AlertCircle, ArrowRight, KeyRound, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('analyst');
  const [password, setPassword] = useState('FraudShield2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login } = useAuth();
  const { addToast } = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(username, password);
      addToast(`Authenticated as ${user.full_name} (${user.role})`, 'success');
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient grid and glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))]"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-500/20 mb-3">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">FraudShield SOC</h1>
          <p className="text-xs text-slate-400 mt-1">Real-Time Fraud Risk Assessment Engine (PS-002)</p>
        </div>

        {/* Login Box */}
        <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <h2 className="text-lg font-semibold text-white mb-2">Analyst Authentication</h2>
          <p className="text-xs text-slate-400 mb-6">Enter demo credentials to access real-time security monitoring</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                Username / Call Sign
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-navy-950 border border-navy-750 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-400 transition-colors"
                  placeholder="analyst or admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                Security Passcode
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-navy-950 border border-navy-750 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-400 transition-colors"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Console'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Demo Quick-Fill Buttons */}
          <div className="mt-6 pt-5 border-t border-navy-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>One-Click Demo Credentials:</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('analyst', 'FraudShield2026!')}
                className="p-2 rounded-lg bg-navy-850 hover:bg-navy-800 border border-navy-750 text-left transition-colors"
              >
                <div className="text-xs font-semibold text-slate-200">Alex Rivera</div>
                <div className="text-[10px] text-cyan-400 font-mono">Role: Analyst</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('admin', 'AdminShield2026!')}
                className="p-2 rounded-lg bg-navy-850 hover:bg-navy-800 border border-navy-750 text-left transition-colors"
              >
                <div className="text-xs font-semibold text-slate-200">Samantha S.</div>
                <div className="text-[10px] text-purple-400 font-mono">Role: Admin (Settings)</div>
              </button>
            </div>
          </div>
        </div>

        {/* Disclaimer Footer */}
        <p className="text-center text-[11px] text-slate-400 mt-6 max-w-sm mx-auto">
          FraudShield operates entirely on simulated events. Never connect real credentials or real financial accounts.
        </p>
      </div>
    </div>
  );
}
