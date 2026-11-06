import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Building2,
  CheckCircle2,
  Clock,
  Filter,
  Lock,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { MembershipStatus, UserRole } from '../../types';

interface PlatformAdminStaffProps {
  token: string;
}

export const PlatformAdminStaff: React.FC<PlatformAdminStaffProps> = ({ token }) => {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [facilityFilter, setFacilityFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/platform-admin/staff', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.staff || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [token]);

  // Extract unique facilities for filter dropdown
  const facilitiesOptions = Array.from(
    new Set(staffList.map((s) => s.facilityCode || s.facilityName))
  ).filter(Boolean);

  const filteredStaff = staffList.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (s.username && s.username.toLowerCase().includes(q)) ||
      (s.displayName && s.displayName.toLowerCase().includes(q)) ||
      (s.facilityCode && s.facilityCode.toLowerCase().includes(q)) ||
      (s.facilityName && s.facilityName.toLowerCase().includes(q)) ||
      (s.departmentId && s.departmentId.toLowerCase().includes(q));

    const matchesFacility =
      facilityFilter === 'ALL' ||
      s.facilityCode === facilityFilter ||
      s.facilityName === facilityFilter;

    const matchesRole = roleFilter === 'ALL' || s.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;

    return matchesSearch && matchesFacility && matchesRole && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Active
          </span>
        );
      case 'Suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Suspended
          </span>
        );
      case 'Revoked':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Revoked
          </span>
        );
      case 'Invited':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Invited
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/20 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-5 h-5 text-emerald-400" />
            <span>Platform-wide Staff Membership Directory</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Displaying {filteredStaff.length} of {staffList.length} hospital staff memberships across all registered facilities
          </p>
        </div>

        <button
          type="button"
          onClick={fetchStaff}
          disabled={isLoading}
          className="cb-btn inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Security Privacy Notice */}
      <div className="p-3.5 bg-slate-800/60 border border-slate-700 rounded-xl flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Cryptographic Security & Privacy Guarantee:</strong> Passwords, password hashes, salt values, and confidential patient records are strictly isolated from platform views.
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest hidden md:inline">
          RBAC Governed
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0B1F33] border border-slate-700/60 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search username, role, hospital..."
                className="w-full bg-[#07131F] text-white border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>

          {/* Facility Filter */}
          <div>
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              className="w-full bg-[#07131F] text-slate-200 border border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="ALL">All Hospital Workspaces</option>
              {facilitiesOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-[#07131F] text-slate-200 border border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="ALL">All Roles</option>
              <option value="Clinician">Clinician (Doctor / Nurse)</option>
              <option value="FacilityAdmin">Facility Administrator</option>
              <option value="Admin">Clinical Admin</option>
              <option value="Staff">Medical Records / Staff</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#07131F] text-slate-200 border border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="ALL">All Account Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="Revoked">Revoked</option>
              <option value="Invited">Invited</option>
            </select>
          </div>
        </div>

        {(searchQuery || facilityFilter !== 'ALL' || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            <span>Filtering active: showing {filteredStaff.length} accounts</span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFacilityFilter('ALL');
                setRoleFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="text-[#3B82F6] hover:underline"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Staff Table */}
      <div className="bg-[#0B1F33] border border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#07131F] border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-5 py-3.5">Staff Username</th>
                <th className="px-4 py-3.5">Hospital Code</th>
                <th className="px-4 py-3.5">Facility Name</th>
                <th className="px-4 py-3.5">Assigned Role</th>
                <th className="px-4 py-3.5">Department</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Created</th>
                <th className="px-4 py-3.5">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    No staff memberships match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => (
                  <tr key={staff.membershipId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-mono font-semibold text-white">
                        {staff.username}
                      </div>
                      <div className="text-[11px] text-slate-400">{staff.displayName || staff.email}</div>
                    </td>

                    <td className="px-4 py-3.5 font-mono font-bold text-slate-200">
                      <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-[11px]">
                        {staff.facilityCode}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-slate-300">
                      {staff.facilityName || staff.facilityCode}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-slate-200">{staff.role}</span>
                    </td>

                    <td className="px-4 py-3.5 text-slate-300">
                      {staff.departmentId || 'General Outpatient (GOPD)'}
                    </td>

                    <td className="px-4 py-3.5">
                      {getStatusBadge(staff.status)}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-400 text-[11px]">
                      {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-400 text-[11px]">
                      {staff.lastLogin
                        ? new Date(staff.lastLogin).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Active'}
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
