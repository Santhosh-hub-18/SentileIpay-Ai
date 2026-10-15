import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  Smartphone,
  MapPin,
  Clock
} from 'lucide-react';
import { api } from '../api/client';
import { RiskBadge } from '../components/common/RiskBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { EventGeneratorBar } from '../components/simulation/EventGeneratorBar';
import { ScoreBreakdownModal } from '../components/common/ScoreBreakdownModal';

export function LiveMonitoring() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortDesc, setSortDesc] = useState(true);

  // Drilldown
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await api.listEvents({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        risk_level: riskFilter || undefined,
        event_type: typeFilter || undefined,
        status: statusFilter || undefined,
        sort_by: sortBy,
        sort_desc: sortDesc,
      });

      setEvents(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, riskFilter, typeFilter, statusFilter, sortBy, sortDesc]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      fetchEvents();
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const handleEventGenerated = () => {
    setPage(1);
    fetchEvents();
  };

  return (
    <div className="space-y-6">
      {/* Simulation Controls Bar */}
      <EventGeneratorBar onEventGenerated={handleEventGenerated} />

      {/* Main Monitoring Panel */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Filters Header */}
        <div className="p-4 md:p-5 border-b border-navy-800 bg-navy-850 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">Live Event Monitoring Stream</h2>
              <p className="text-xs text-slate-400">Real-time inspection of simulated financial events & server scoring</p>
            </div>
            <div className="text-xs font-mono text-slate-400">
              Showing <span className="text-cyan-400 font-bold">{events.length}</span> of <span className="text-white font-bold">{total}</span> events
            </div>
          </div>

          {/* Search and Filters Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by customer, event ID, city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Risk Tier Filter */}
            <div>
              <select
                value={riskFilter}
                onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="">All Risk Tiers</option>
                <option value="NORMAL">Normal (0-30)</option>
                <option value="SEND_MESSAGE">Medium (31-50)</option>
                <option value="OTP_VERIFICATION">Elevated OTP (51-70)</option>
                <option value="CALL_VERIFICATION">High Call (71-90)</option>
                <option value="TEMPORARY_BLOCK">Critical Block (91-100)</option>
              </select>
            </div>

            {/* Event Type Filter */}
            <div>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="">All Event Types</option>
                <option value="PAYMENT">Payment</option>
                <option value="LOGIN">Login</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 bg-navy-950 border border-navy-750 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="">All Statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="FLAGGED_NOTIFIED">Flagged / Notified</option>
                <option value="PENDING_OTP">Pending OTP</option>
                <option value="PENDING_MANUAL_VERIFICATION">Pending Call Verification</option>
                <option value="TEMPORARILY_BLOCKED">Temporarily Blocked</option>
                <option value="VERIFIED">Verified</option>
                <option value="RELEASED">Released</option>
                <option value="TEST_DATA">Test Data</option>
              </select>
            </div>
          </div>
        </div>

        {/* Events Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-navy-800 bg-navy-850/40 text-slate-400 font-medium">
                <th className="py-3 px-4">Event Ref</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Device</th>
                <th className="py-3 px-3">Location</th>
                <th className="py-3 px-3 text-center">Score & Tier</th>
                <th className="py-3 px-3 text-center">Recommended Action</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Time</th>
                <th className="py-3 px-3 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan="11" className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Loading real-time events stream...</span>
                    </div>
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan="11" className="py-12 text-center text-slate-400 font-sans">
                    No matching events found. Try adjusting filters or click simulation buttons above.
                  </td>
                </tr>
              ) : (
                events.map((evt) => {
                  const ra = evt.risk_assessment;
                  return (
                    <tr
                      key={evt.id}
                      onClick={() => setSelectedEvent(evt)}
                      className="hover:bg-navy-800/50 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 text-cyan-400 font-semibold group-hover:text-cyan-300">
                        {evt.id}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-200">
                        <div className="font-medium text-white">{evt.customer_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{evt.customer_id}</div>
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-300">{evt.event_type}</td>
                      <td className="py-3 px-3 text-white font-bold font-mono">
                        {evt.amount > 0 ? `$${evt.amount.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className={evt.device_known ? 'text-slate-300' : 'text-amber-400 font-medium'}>
                            {evt.device_known ? 'Known' : 'Unfamiliar'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate max-w-[120px]">{evt.location_city}</span>
                          {!evt.location_known && (
                            <span className="text-[10px] text-rose-400 font-bold font-mono">!</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <RiskBadge score={ra?.total_score} tier={ra?.risk_level} />
                      </td>
                      <td className="py-3 px-3 text-center font-sans text-[11px] text-slate-300">
                        {ra?.recommended_action || '—'}
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <StatusBadge status={evt.status} />
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400 text-[11px]">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(evt);
                          }}
                          className="p-1 rounded-md text-slate-400 group-hover:text-cyan-400 hover:bg-navy-750 transition-colors"
                          title="Inspect score breakdown"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-navy-800 bg-navy-850 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div>
            Page <span className="text-white font-bold">{page}</span> of <span className="text-white font-bold">{totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-navy-750 bg-navy-900 hover:bg-navy-800 text-slate-300 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-navy-750 bg-navy-900 hover:bg-navy-800 text-slate-300 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Drilldown Modal */}
      {selectedEvent && (
        <ScoreBreakdownModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
