import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  MapPin,
  Mail,
  Phone,
  Search,
  Shield,
  ShieldAlert,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { Facility, FacilityStatus, FacilityType } from '../../types';
import { NIGERIAN_STATES } from '../../data/seedData';

interface PlatformAdminFacilitiesProps {
  facilities: (Facility & { staffCount?: number })[];
  onRefresh: () => void;
  isLoading: boolean;
  token: string;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const PlatformAdminFacilities: React.FC<PlatformAdminFacilitiesProps> = ({
  facilities,
  onRefresh,
  isLoading,
  token,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [stateFilter, setStateFilter] = useState<string>('ALL');

  // Facility detail modal state
  const [selectedFacilityDetail, setSelectedFacilityDetail] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const filteredFacilities = facilities.filter((f) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      f.name.toLowerCase().includes(q) ||
      (f.facilityCode || '').toLowerCase().includes(q) ||
      (f.location || '').toLowerCase().includes(q) ||
      (f.contactEmail || '').toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || (f.status || 'Active') === statusFilter;
    const matchesType = typeFilter === 'ALL' || f.facilityType === typeFilter;
    const matchesState = stateFilter === 'ALL' || f.state === stateFilter;

    return matchesSearch && matchesStatus && matchesType && matchesState;
  });

  const handleInspectFacility = async (facilityId: string) => {
    setIsDetailLoading(true);
    try {
      const res = await fetch(`/api/platform-admin/facilities/${facilityId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedFacilityDetail(data.facility);
      } else {
        // Fallback to local data
        const local = facilities.find((f) => f.id === facilityId);
        setSelectedFacilityDetail(local || null);
      }
    } catch {
      const local = facilities.find((f) => f.id === facilityId);
      setSelectedFacilityDetail(local || null);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const getStatusBadge = (status?: FacilityStatus) => {
    const st = status || 'Active';
    switch (st) {
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Active
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Pending Review
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Rejected
          </span>
        );
      case 'Suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/20 text-slate-400 border border-slate-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            {st}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-[#1769E0]" />
            <span>Registered Healthcare Facilities Directory</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Displaying {filteredFacilities.length} of {facilities.length} registered Nigerian hospitals and clinics
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0B1F33] border border-slate-700/60 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hospital or code..."
              className="w-full bg-[#07131F] text-white border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#07131F] text-slate-200 border border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active Workspaces</option>
              <option value="Pending">Pending Review</option>
              <option value="Rejected">Rejected</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-[#07131F] text-slate-200 border border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="ALL">All Facility Types</option>
              <option value="Hospital">Multi-Department Hospital</option>
              <option value="Specialist Clinic">Specialist Clinic</option>
              <option value="Comprehensive Medical Center">Comprehensive Medical Center</option>
              <option value="Primary Care Clinic">Primary Care Clinic</option>
            </select>
          </div>

          {/* Nigerian State Filter */}
          <div>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full bg-[#07131F] text-slate-200 border border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="ALL">All Nigerian States</option>
              {NIGERIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL' || stateFilter !== 'ALL') && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            <span>Filtering active: showing {filteredFacilities.length} results</span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setTypeFilter('ALL');
                setStateFilter('ALL');
              }}
              className="text-[#3B82F6] hover:underline"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Facilities Table */}
      <div className="bg-[#0B1F33] border border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#07131F] border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-5 py-3.5">Hospital Name</th>
                <th className="px-4 py-3.5">Hospital Code</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5">Location</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Staff</th>
                <th className="px-4 py-3.5">Registered</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredFacilities.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    No registered facilities match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredFacilities.map((fac) => (
                  <tr
                    key={fac.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => handleInspectFacility(fac.id)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-white group-hover:text-[#3B82F6] transition-colors">
                        {fac.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">
                        {fac.contactEmail}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-mono font-bold text-slate-200">
                      <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {fac.facilityCode}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-slate-300">
                      {fac.facilityType || 'Hospital'}
                    </td>

                    <td className="px-4 py-3.5 text-slate-300">
                      <div>{fac.state || 'Lagos State'}</div>
                      <div className="text-[11px] text-slate-400">{fac.city || fac.location}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      {getStatusBadge(fac.status)}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-300">
                      {fac.staffCount ?? fac.departments?.length ?? 1} members
                    </td>

                    <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px]">
                      {fac.createdAt ? new Date(fac.createdAt).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInspectFacility(fac.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs transition-colors border border-slate-700"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Facility Inspection Modal */}
      <AnimatePresence>
        {selectedFacilityDetail && (
          <div className="fixed inset-0 z-50 bg-[#07131F]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
              className="bg-[#0B1F33] border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-slate-100 space-y-6"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-[#1769E0]/20 text-[#3B82F6] px-2 py-0.5 rounded border border-[#1769E0]/30">
                      {selectedFacilityDetail.facilityCode}
                    </span>
                    {getStatusBadge(selectedFacilityDetail.status)}
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {selectedFacilityDetail.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedFacilityDetail.facilityType} · {selectedFacilityDetail.address || selectedFacilityDetail.location}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFacilityDetail(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Notice if Rejected */}
              {selectedFacilityDetail.status === 'Rejected' && selectedFacilityDetail.rejectionReason && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs space-y-1">
                  <span className="font-semibold text-rose-300 block">Rejection Reason:</span>
                  <p className="text-rose-200">{selectedFacilityDetail.rejectionReason}</p>
                </div>
              )}

              {/* Contact & Administrative Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-[#07131F] p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                    Location & Contact
                  </span>
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{selectedFacilityDetail.address || selectedFacilityDetail.location}, {selectedFacilityDetail.city}, {selectedFacilityDetail.state}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{selectedFacilityDetail.contactEmail || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{selectedFacilityDetail.contactPhone || 'N/A'}</span>
                  </div>
                </div>

                <div className="bg-[#07131F] p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                    Primary Administrator
                  </span>
                  <div className="font-semibold text-white">
                    {selectedFacilityDetail.adminName || 'Dr. Babatunde Adelakun'}
                  </div>
                  <div className="text-slate-400">
                    {selectedFacilityDetail.adminRoleTitle || 'Chief Medical Director'}
                  </div>
                  <div className="text-slate-400 font-mono">
                    {selectedFacilityDetail.adminEmail || selectedFacilityDetail.contactEmail}
                  </div>
                </div>
              </div>

              {/* Clinical Departments */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                  Configured Clinical Departments ({selectedFacilityDetail.departments?.length || 0})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedFacilityDetail.departments || []).map((dept: string) => (
                    <span
                      key={dept}
                      className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 text-slate-200 border border-slate-700"
                    >
                      {dept}
                    </span>
                  ))}
                </div>
              </div>

              {/* Associated Staff Memberships */}
              {selectedFacilityDetail.staffMemberships && selectedFacilityDetail.staffMemberships.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                    Registered Staff Accounts ({selectedFacilityDetail.staffMemberships.length})
                  </span>
                  <div className="bg-[#07131F] rounded-xl border border-slate-800 divide-y divide-slate-800/80 max-h-48 overflow-y-auto">
                    {selectedFacilityDetail.staffMemberships.map((m: any) => (
                      <div key={m.membershipId} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-mono font-semibold text-white mr-2">
                            {m.username}
                          </span>
                          <span className="text-slate-400">({m.displayName || m.role})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">{m.departmentId || 'General'}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {m.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedFacilityDetail(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Close Inspection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
