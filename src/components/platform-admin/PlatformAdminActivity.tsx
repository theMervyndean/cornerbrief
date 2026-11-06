import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  Calendar,
  Clock,
  Filter,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
} from 'lucide-react';

interface PlatformAdminActivityProps {
  token: string;
}

export const PlatformAdminActivity: React.FC<PlatformAdminActivityProps> = ({ token }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [facilityFilter, setFacilityFilter] = useState('ALL');
  const [limit, setLimit] = useState('50');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const url = new URL('/api/platform-admin/activity', window.location.origin);
      if (facilityFilter !== 'ALL') url.searchParams.set('facilityId', facilityFilter);
      if (searchQuery.trim()) url.searchParams.set('search', searchQuery.trim());
      url.searchParams.set('limit', limit);

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token, facilityFilter, limit]);

  // Unique facilities
  const facilitiesOptions = Array.from(
    new Set(logs.map((l) => l.facilityId).filter(Boolean))
  );

  const getActionBadgeColor = (action: string) => {
    const act = (action || '').toLowerCase();
    if (act.includes('approved') || act.includes('activated')) {
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
    if (act.includes('rejected') || act.includes('denied') || act.includes('failed')) {
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    }
    if (act.includes('registered') || act.includes('submitted')) {
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    }
    if (act.includes('signed in') || act.includes('authenticated') || act.includes('session')) {
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    }
    return 'bg-slate-700/50 text-slate-300 border-slate-700';
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-[#1769E0]" />
            <span>Platform Audit & Security Event Logs</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Immutable administrative journal tracking hospital onboarding, authorizations, and security events
          </p>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
          disabled={isLoading}
          className="cb-btn inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0B1F33] border border-slate-700/60 rounded-2xl p-4 space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchLogs();
          }}
          className="grid grid-cols-1 md:grid-cols-4 gap-3"
        >
          {/* Keyword Search */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by keyword (e.g. approve, reject, sign in, Lagos)..."
              className="w-full bg-[#07131F] text-white border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          {/* Facility Filter */}
          <div>
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              className="w-full bg-[#07131F] text-slate-200 border border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="ALL">All Facilities & Platform</option>
              {facilitiesOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Record Limit */}
          <div>
            <select
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-full bg-[#07131F] text-slate-200 border border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="25">Show Last 25</option>
              <option value="50">Show Last 50</option>
              <option value="100">Show Last 100</option>
              <option value="150">Show Last 150</option>
            </select>
          </div>
        </form>
      </div>

      {/* Logs Table */}
      <div className="bg-[#0B1F33] border border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#07131F] border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Event Description</th>
                <th className="px-4 py-3.5">Initiator / User</th>
                <th className="px-4 py-3.5">Facility Context</th>
                <th className="px-4 py-3.5">Details / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    No platform audit events found matching the criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-slate-300 whitespace-nowrap">
                      <div>
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(log.timestamp).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium border ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-semibold text-slate-200">
                      {log.userName || 'System Central'}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-400">
                      {log.facilityId ? (
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-700">
                          {log.facilityId}
                        </span>
                      ) : (
                        <span className="text-slate-600">Platform Global</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-slate-400 text-[11px] max-w-md truncate">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
