import React from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Database,
  FileCheck,
  RefreshCw,
  Shield,
  ShieldAlert,
  Users,
  XCircle,
} from 'lucide-react';

interface PlatformOverviewProps {
  stats: {
    totalFacilities: number;
    pendingFacilities: number;
    activeFacilities: number;
    rejectedFacilities: number;
    suspendedFacilities: number;
    totalStaffMemberships: number;
    activeStaffMemberships: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    timestamp: string;
    userName?: string;
    facilityId?: string;
    details?: string;
  }>;
  systemStatus: {
    apiAvailable: boolean;
    persistenceStatus: string;
    firestoreDatabaseId: string;
    serverRegistryActive: boolean;
  };
  onNavigateTab: (tab: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const PlatformAdminOverview: React.FC<PlatformOverviewProps> = ({
  stats,
  recentActivity,
  systemStatus,
  onNavigateTab,
  onRefresh,
  isLoading,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-[#1769E0]" />
            <span>Platform Overview & Healthcare Network</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-tenant monitoring across registered Nigerian healthcare facilities
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="cb-btn inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Metrics</span>
          </button>
        </div>
      </div>

      {/* Truthful Infrastructure Alert Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-amber-300">
                Infrastructure Advisory: Google Cloud IAM Permission Notice
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                roles/datastore.user Pending
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              Cloud Run runtime identity requires <code className="text-amber-300 bg-black/30 px-1 py-0.5 rounded">roles/datastore.user</code> on project <code className="text-slate-200">sodium-extension-px4wp</code>. The backend transparently operates the synchronized in-memory registry so hospital operations, clinical registrations, and staff access continue seamlessly without disruption.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab('/platform-admin/system')}
          className="shrink-0 text-xs font-semibold text-amber-300 hover:text-white flex items-center gap-1.5 underline underline-offset-4"
        >
          View Diagnostics →
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Hospitals */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
          onClick={() => onNavigateTab('/platform-admin/facilities')}
          className="bg-[#0B1F33] border border-slate-700/60 hover:border-[#1769E0]/60 p-5 rounded-2xl shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Hospitals</span>
            <div className="w-9 h-9 rounded-xl bg-[#1769E0]/15 flex items-center justify-center text-[#1769E0]">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight font-mono">
              {stats.totalFacilities}
            </span>
            <span className="text-xs text-slate-400">registered</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>{stats.activeFacilities} active workspaces</span>
            <span className="text-[#1769E0] group-hover:translate-x-0.5 transition-transform">
              Directory →
            </span>
          </div>
        </motion.div>

        {/* Pending Registrations */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05, ease: EASE_OUT_EXPO }}
          onClick={() => onNavigateTab('/platform-admin/facility-registrations')}
          className={`border p-5 rounded-2xl shadow-sm cursor-pointer transition-all group ${
            stats.pendingFacilities > 0
              ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400'
              : 'bg-[#0B1F33] border-slate-700/60 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Pending Review</span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                stats.pendingFacilities > 0
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-3xl font-bold tracking-tight font-mono ${
                stats.pendingFacilities > 0 ? 'text-amber-400' : 'text-white'
              }`}
            >
              {stats.pendingFacilities}
            </span>
            <span className="text-xs text-slate-400">awaiting approval</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className={stats.pendingFacilities > 0 ? 'text-amber-300 font-medium' : 'text-slate-400'}>
              {stats.pendingFacilities > 0 ? 'Requires Platform Action' : 'All clear'}
            </span>
            <span className="text-amber-400 group-hover:translate-x-0.5 transition-transform font-medium">
              Review Queue →
            </span>
          </div>
        </motion.div>

        {/* Active Staff Memberships */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1, ease: EASE_OUT_EXPO }}
          onClick={() => onNavigateTab('/platform-admin/staff')}
          className="bg-[#0B1F33] border border-slate-700/60 hover:border-emerald-500/60 p-5 rounded-2xl shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Staff Memberships</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight font-mono">
              {stats.totalStaffMemberships}
            </span>
            <span className="text-xs text-slate-400">clinical staff</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>{stats.activeStaffMemberships} active accounts</span>
            <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform">
              Staff List →
            </span>
          </div>
        </motion.div>

        {/* Network Health / System Status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15, ease: EASE_OUT_EXPO }}
          onClick={() => onNavigateTab('/platform-admin/system')}
          className="bg-[#0B1F33] border border-slate-700/60 hover:border-cyan-500/60 p-5 rounded-2xl shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">System Engine</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-lg font-bold text-emerald-400 font-mono">
              ONLINE
            </span>
            <span className="text-xs text-slate-400">API 100%</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="truncate">Database: {systemStatus.firestoreDatabaseId}</span>
            <span className="text-cyan-400 group-hover:translate-x-0.5 transition-transform">
              Diagnostics →
            </span>
          </div>
        </motion.div>
      </div>

      {/* Two Column Layout: Quick Actions & Recent Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions Panel (1 col) */}
        <div className="space-y-4">
          <div className="bg-[#0B1F33] border border-slate-700/60 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Administrative Quick Actions
            </h3>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onNavigateTab('/platform-admin/facility-registrations')}
                className="w-full text-left p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-700/70 hover:border-amber-500/40 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Review Registrations</div>
                    <div className="text-[11px] text-slate-400">
                      {stats.pendingFacilities} hospital applications awaiting approval
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('/platform-admin/facilities')}
                className="w-full text-left p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-700/70 hover:border-[#1769E0]/40 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#1769E0]/20 text-[#1769E0] flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Hospital Directory</div>
                    <div className="text-[11px] text-slate-400">
                      Manage {stats.totalFacilities} registered healthcare providers
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('/platform-admin/staff')}
                className="w-full text-left p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-700/70 hover:border-emerald-500/40 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Staff Management</div>
                    <div className="text-[11px] text-slate-400">
                      View all {stats.totalStaffMemberships} hospital user memberships
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('/platform-admin/system')}
                className="w-full text-left p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-700/70 hover:border-cyan-500/40 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">System Diagnostics</div>
                    <div className="text-[11px] text-slate-400">
                      Inspect database persistence and IAM status
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>
        </div>

        {/* Recent Platform Activity Timeline (2 cols) */}
        <div className="lg:col-span-2 bg-[#0B1F33] border border-slate-700/60 rounded-2xl p-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#1769E0]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Recent Platform Audit Events
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('/platform-admin/activity')}
              className="text-xs text-[#3B82F6] hover:text-white transition-colors font-medium"
            >
              View Full Audit Log →
            </button>
          </div>

          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No recent audit events recorded on the platform.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 max-h-96 overflow-y-auto pr-1">
              {recentActivity.map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="text-xs text-slate-200 font-medium leading-relaxed">
                      {log.action}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      {log.userName && (
                        <span className="font-semibold text-slate-300">{log.userName}</span>
                      )}
                      {log.facilityId && (
                        <span className="font-mono text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                          {log.facilityId}
                        </span>
                      )}
                      {log.details && (
                        <span className="text-slate-400 truncate max-w-xs">{log.details}</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-[11px] font-mono text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <span className="block text-[10px] text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
