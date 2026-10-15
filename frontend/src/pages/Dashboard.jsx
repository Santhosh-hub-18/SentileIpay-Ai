import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  KeyRound,
  PhoneCall,
  Ban,
  Bell,
  TrendingUp,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { api } from '../api/client';
import { StatCard } from '../components/common/StatCard';
import { RiskBadge } from '../components/common/RiskBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { EventGeneratorBar } from '../components/simulation/EventGeneratorBar';
import { ScoreBreakdownModal } from '../components/common/ScoreBreakdownModal';

export function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);

  const loadData = async () => {
    try {
      const [statsData, eventsData] = await Promise.all([
        api.getStats(),
        api.listEvents({ page: 1, page_size: 8 }),
      ]);
      setStats(statsData);
      setRecentEvents(eventsData.items || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto sync every 15 seconds
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleEventGenerated = () => {
    loadData();
  };

  const summary = stats?.summary || {};
  const riskDistribution = stats?.risk_distribution || [];
  const activityTimeline = stats?.activity_timeline || [];

  return (
    <div className="space-y-6">
      {/* Simulation Controls Toolbar */}
      <EventGeneratorBar onEventGenerated={handleEventGenerated} />

      {/* Top Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard
          title="Total Events"
          value={summary.total_events || 0}
          icon={Activity}
          color="blue"
          onClick={() => onNavigate('monitoring')}
        />
        <StatCard
          title="Normal (0-30)"
          value={summary.normal_count || 0}
          icon={ShieldCheck}
          color="emerald"
          onClick={() => onNavigate('monitoring')}
        />
        <StatCard
          title="Medium (31-50)"
          value={summary.suspicious_count || 0}
          icon={AlertTriangle}
          color="amber"
          onClick={() => onNavigate('alerts')}
        />
        <StatCard
          title="OTP Req (51-70)"
          value={summary.otp_requests_count || 0}
          icon={KeyRound}
          color="orange"
          onClick={() => onNavigate('otp')}
        />
        <StatCard
          title="Manual (71-90)"
          value={summary.manual_cases_count || 0}
          icon={PhoneCall}
          color="red"
          onClick={() => onNavigate('call-cases')}
        />
        <StatCard
          title="Blocked (91-100)"
          value={summary.blocked_count || 0}
          icon={Ban}
          color="darkred"
          onClick={() => onNavigate('blocks')}
        />
        <StatCard
          title="Active Alerts"
          value={summary.active_alerts || 0}
          icon={Bell}
          color="blue"
          changeText={`${summary.total_alerts || 0} Total`}
          onClick={() => onNavigate('alerts')}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution Bar Chart */}
        <div className="p-5 rounded-2xl bg-navy-900 border border-navy-800 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Risk Distribution</h3>
              <p className="text-xs text-slate-400">Events grouped across the 5 risk action boundaries</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-800 text-cyan-400">
              0 - 100 Tiers
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: '#F1F5F9' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Over Time Area Chart */}
        <div className="p-5 rounded-2xl bg-navy-900 border border-navy-800 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Transaction Activity</h3>
              <p className="text-xs text-slate-400">Timeline volume and high-risk surge detection</p>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Total
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span> High Risk
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="time" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="total" stroke="#06B6D4" fillOpacity={1} fill="url(#totalGradient)" strokeWidth={2} />
                <Area type="monotone" dataKey="high_risk" stroke="#EF4444" fillOpacity={1} fill="url(#riskGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Level Donut Breakdown */}
        <div className="p-5 rounded-2xl bg-navy-900 border border-navy-800 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Severity Share</h3>
              <p className="text-xs text-slate-400">Overall risk posture across monitored pool</p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconSize={8}
                  wrapperStyle={{ fontSize: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Monitored Events Feed */}
      <div className="p-5 rounded-2xl bg-navy-900 border border-navy-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Recent Monitored Operations</h3>
            <p className="text-xs text-slate-400">Click any row to inspect the full 8-criteria scoring breakdown</p>
          </div>
          <button
            onClick={() => onNavigate('monitoring')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors"
          >
            <span>Open Live Monitoring</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-navy-800 bg-navy-850/50 text-slate-400 font-medium">
                <th className="py-2.5 px-3">Event Ref</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3 text-center">Score & Tier</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 font-mono">
              {recentEvents.map((evt) => {
                const ra = evt.risk_assessment;
                return (
                  <tr
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className="hover:bg-navy-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 text-cyan-400 font-semibold">{evt.id}</td>
                    <td className="py-3 px-3 font-sans text-slate-200">
                      <div>{evt.customer_name}</div>
                      <div className="text-[10px] text-slate-500">{evt.customer_id}</div>
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-300">{evt.event_type}</td>
                    <td className="py-3 px-3 text-white font-bold">
                      {evt.amount > 0 ? `$${evt.amount.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-400">
                      {evt.location_city}, {evt.location_country}
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      <RiskBadge score={ra?.total_score} tier={ra?.risk_level} />
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      <StatusBadge status={evt.status} />
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                );
              })}
              {recentEvents.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    No recent events detected. Use the simulation controls above to ingest events.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-down Score Breakdown Modal */}
      {selectedEvent && (
        <ScoreBreakdownModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
