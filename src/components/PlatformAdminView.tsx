import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import {
  AuditLog,
  Encounter,
  Facility,
  FacilityStatus,
  Patient,
  UserProfile,
} from '../types';
import { Tooltip } from './Tooltip';
import { CornerBriefLogo } from './CornerBriefLogo';

interface PlatformAdminViewProps {
  facilities: Facility[];
  activeFacilityId: string;
  allPatients: Patient[];
  allEncounters: Encounter[];
  allStaff: UserProfile[];
  allAuditLogs: AuditLog[];
  onSwitchFacility: (facilityId: string) => void;
  onUpdateFacilityStatus: (facilityId: string, status: FacilityStatus) => Promise<void>;
  onOpenRegisterFacility: () => void;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const PlatformAdminView: React.FC<PlatformAdminViewProps> = ({
  facilities,
  activeFacilityId,
  allPatients,
  allEncounters,
  allStaff,
  allAuditLogs,
  onSwitchFacility,
  onUpdateFacilityStatus,
  onOpenRegisterFacility,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const activeFacilitiesCount = facilities.filter(
    (f) => (f.status || 'Active') === 'Active'
  ).length;
  const finalizedEncountersCount = allEncounters.filter(
    (e) => e.status === 'Finalized'
  ).length;
  const pendingReviewCount = allEncounters.filter(
    (e) => e.status === 'Pending Review' || e.status === 'AI Generated'
  ).length;

  const filteredFacilities = facilities.filter((fac) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      fac.name.toLowerCase().includes(q) ||
      fac.location.toLowerCase().includes(q) ||
      (fac.facilityCode || '').toLowerCase().includes(q) ||
      (fac.state || '').toLowerCase().includes(q);

    const facType = fac.facilityType || 'Specialist Clinic';
    const matchesType = typeFilter === 'ALL' || facType === typeFilter;

    const facStatus = fac.status || 'Active';
    const matchesStatus = statusFilter === 'ALL' || facStatus === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getFacilityName = (facilityId: string) => {
    const found = facilities.find((f) => f.id === facilityId);
    return found ? found.name : facilityId;
  };

  const recentPlatformLogs = [...allAuditLogs]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 12);

  return (
    <div className="space-y-6">
      {/* Platform Administration Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
        className="bg-[#0B1F33] text-white rounded-xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div className="flex items-start gap-4">
          <CornerBriefLogo size="lg" theme="dark" variant="glow" className="shrink-0 mt-1" />
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#0E9F9A] font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>CORNERBRIEF PLATFORM ADMINISTRATION · MULTI-TENANT GOVERNANCE</span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
              Healthcare Network &amp; Tenant Operations Console
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Oversee registered hospitals and clinics across Nigeria, verify tenant data isolation boundaries, manage facility operational status, and audit NONYE AI clinician-review compliance.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenRegisterFacility}
            className="cb-btn cb-btn-teal py-2.5 px-4 text-xs font-semibold rounded-lg gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard New Facility</span>
          </button>
        </div>
      </motion.div>

      {/* Platform-Wide KPIs (Max 4 cards in a single row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Registered Healthcare Facilities',
            value: facilities.length,
            subtext: `${activeFacilitiesCount} active · Multi-state coverage`,
            Icon: Building2,
            color: 'text-[#1769E0]',
          },
          {
            label: 'Platform Patient Records',
            value: allPatients.length,
            subtext: 'Strictly isolated per facility tenant',
            Icon: Users,
            color: 'text-[#0E9F9A]',
          },
          {
            label: 'Clinical Encounters Recorded',
            value: allEncounters.length,
            subtext: `${finalizedEncountersCount} finalized · ${pendingReviewCount} awaiting review`,
            Icon: Activity,
            color: 'text-[#16A34A]',
          },
          {
            label: 'NONYE AI Review Compliance',
            value: '100%',
            subtext: 'Zero autonomous sign-offs permitted',
            Icon: ClipboardCheck,
            color: 'text-[#0E9F9A]',
          },
        ].map((metric, idx) => {
          const Icon = metric.Icon;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05, ease: EASE_OUT_EXPO }}
              className="bg-white border border-[#E2E8F0] rounded-xl p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">{metric.label}</span>
                <Icon className={`w-4 h-4 ${metric.color}`} />
              </div>
              <div className="mt-3 font-mono text-2xl font-bold text-[#0B1F33] tabular-nums">
                {metric.value}
              </div>
              <p className="mt-1 text-xs text-[#64748B]">{metric.subtext}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Multi-Hospital Tenant Directory */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-[#0B1F33]">
              Registered Healthcare Facility Tenants
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Each facility below operates an isolated clinical workspace with independent patient IDs, staff roles, and encounter histories.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search hospital, code, or state..."
                className="cb-input w-full pl-9 pr-8 py-1.5 text-xs rounded-lg"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="cb-icon-btn absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#0B1F33]"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="cb-input px-3 py-1.5 text-xs rounded-lg font-medium"
            >
              <option value="ALL">All Facility Types</option>
              <option value="Hospital">Hospital</option>
              <option value="Specialist Clinic">Specialist Clinic</option>
              <option value="Medical Center">Medical Center</option>
              <option value="Primary Care Clinic">Primary Care Clinic</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="cb-input px-3 py-1.5 text-xs rounded-lg font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Active">Active</option>
              <option value="Onboarding">Onboarding</option>
              <option value="Rejected">Rejected</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F6F9FC] text-[11px] font-semibold text-[#64748B]">
                <th className="py-3.5 px-5">Facility &amp; Code</th>
                <th className="py-3.5 px-4">Type &amp; State</th>
                <th className="py-3.5 px-4">Clinical Departments</th>
                <th className="py-3.5 px-4">Workspace Volume</th>
                <th className="py-3.5 px-4">Tenant Status</th>
                <th className="py-3.5 px-5 text-right">Workspace Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs">
              {filteredFacilities.map((fac) => {
                const isCurrent = fac.id === activeFacilityId;
                const facPatients = allPatients.filter((p) => p.facilityId === fac.id);
                const facEncounters = allEncounters.filter((e) => e.facilityId === fac.id);
                const facStaff = allStaff.filter((s) => s.facilityId === fac.id);
                const facDepts = fac.departments || ['General Outpatient (GOPD)'];
                const facStatus: FacilityStatus = fac.status || 'Active';

                return (
                  <tr
                    key={fac.id}
                    className={`transition-colors duration-150 ${
                      isCurrent ? 'bg-[#1769E0]/[0.04]' : 'hover:bg-[#F6F9FC]'
                    }`}
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                            isCurrent
                              ? 'bg-[#1769E0] text-white'
                              : 'bg-[#0B1F33]/10 text-[#0B1F33]'
                          }`}
                        >
                          {fac.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#0B1F33] text-sm">{fac.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] font-mono font-semibold text-[#1769E0] bg-[#1769E0]/10 px-2 py-0.5 rounded">
                                ACTIVE WORKSPACE
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#64748B] mt-0.5">
                            {fac.location}
                          </div>
                          <div className="text-[11px] font-mono text-[#64748B] mt-0.5">
                            ID: {fac.id} · Code: {fac.facilityCode || 'CB-NG'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-semibold text-[#0B1F33]">
                        {fac.facilityType || 'Specialist Clinic'}
                      </div>
                      <div className="text-[11px] text-[#64748B]">
                        {fac.state || 'Nigeria'}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {facDepts.slice(0, 3).map((dept) => (
                          <span
                            key={dept}
                            className="text-[11px] bg-[#F6F9FC] border border-[#E2E8F0] px-2 py-0.5 rounded text-[#17212B]"
                          >
                            {dept}
                          </span>
                        ))}
                        {facDepts.length > 3 && (
                          <span className="text-[11px] font-mono text-[#64748B] px-1.5 py-0.5">
                            +{facDepts.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono tabular-nums whitespace-nowrap">
                      <div className="text-[#0B1F33] font-semibold">
                        {facPatients.length} Patients · {facEncounters.length} Encounters
                      </div>
                      <div className="text-[11px] text-[#64748B]">
                        {facStaff.length || 3} Authorized Staff
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <select
                        value={facStatus}
                        onChange={(e) =>
                          onUpdateFacilityStatus(fac.id, e.target.value as FacilityStatus)
                        }
                        aria-label={`Status for ${fac.name}`}
                        className={`cb-input px-2.5 py-1 text-xs font-semibold rounded-lg ${
                          facStatus === 'Active'
                            ? 'text-[#16A34A] border-[#16A34A]/30 bg-[#16A34A]/5'
                            : facStatus === 'Pending'
                            ? 'text-amber-800 border-amber-300 bg-amber-50'
                            : facStatus === 'Onboarding'
                            ? 'text-[#D97706] border-[#D97706]/30 bg-[#D97706]/5'
                            : facStatus === 'Rejected'
                            ? 'text-slate-600 border-slate-300 bg-slate-100'
                            : 'text-[#DC2626] border-[#DC2626]/30 bg-[#DC2626]/5'
                        }`}
                      >
                        <option value="Pending">Pending Review</option>
                        <option value="Active">Active &amp; Verified</option>
                        <option value="Onboarding">Onboarding</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Suspended">Suspended</option>
                      </select>
                    </td>

                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      {facStatus === 'Pending' ? (
                        <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold text-amber-800 bg-amber-100 rounded-md border border-amber-300">
                          Awaiting Approval
                        </span>
                      ) : (
                        <Tooltip
                          content={
                            isCurrent
                              ? 'Open this facility dashboard'
                              : `Switch workspace context to ${fac.name}`
                          }
                          side="left"
                        >
                          <button
                            type="button"
                            onClick={() => onSwitchFacility(fac.id)}
                            className={`cb-btn py-1.5 px-3 text-xs font-semibold rounded-lg gap-1.5 ${
                              isCurrent
                                ? 'cb-btn-secondary text-[#1769E0] border-[#1769E0]/40'
                                : 'cb-btn-primary'
                            }`}
                          >
                            <span>{isCurrent ? 'Open Dashboard' : 'Enter Workspace'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Split: Cross-Facility Audit Stream + Multi-Tenant Governance Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cross-Facility Audit Trail */}
        <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-[#0B1F33]">
                Cross-Facility Platform Audit Stream
              </h2>
              <p className="text-xs text-[#64748B]">
                Immutable activity events across all registered healthcare facilities
              </p>
            </div>
            <FileText className="w-4 h-4 text-[#0E9F9A]" />
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {recentPlatformLogs.map((log) => (
              <div
                key={log.id}
                className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-[#F6F9FC] transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-[#1769E0]">
                      [{getFacilityName(log.facilityId)}]
                    </span>
                    <span className="font-semibold text-[#0B1F33]">{log.userName}</span>
                    <span className="text-[#64748B]">({log.userRole})</span>
                  </div>
                  <p className="text-[#17212B]">{log.action}</p>
                </div>
                <span className="font-mono text-[11px] text-[#64748B] tabular-nums shrink-0">
                  {log.timestamp.replace('T', ' ').slice(0, 16)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Multi-Tenant Isolation & NONYE AI Governance Specification */}
        <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-[#0B1F33]" />
            <div>
              <h2 className="font-display text-base font-bold text-[#0B1F33]">
                Platform Architecture &amp; Tenant Isolation
              </h2>
              <p className="text-xs text-[#64748B]">
                Enforced across all CornerBrief hospital and clinic workspaces
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {[
              {
                title: 'Strict Facility Boundary (facilityId Scoping)',
                desc: 'Every patient record, clinical encounter, staff member, and audit event is bound to its parent facilityId. Switching facilities immediately scopes all clinical views and search indexes.',
              },
              {
                title: 'Role-Based Clinical Access Control (RBAC)',
                desc: 'Each facility manages its own Admin, Clinician, and Medical Records Staff permissions. Only authorized Clinicians and Admins can generate or finalize NONYE AI documentation.',
              },
              {
                title: 'Mandatory Human-in-the-Loop AI Attestation',
                desc: 'NONYE AI is strictly restricted from autonomous diagnosis, prescription, or dosage recommendation. Every structured output requires explicit clinician attestation before locking.',
              },
              {
                title: 'Append-Only Clinical Record Integrity',
                desc: 'Once an encounter is marked Finalized by an attending clinician, Firestore security rules and workspace controls lock the record against silent modification.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-3.5 rounded-xl bg-[#F6F9FC] border border-[#E2E8F0] space-y-1"
              >
                <div className="flex items-center gap-2 font-bold text-[#0B1F33]">
                  <CheckCircle2 className="w-4 h-4 text-[#0E9F9A] shrink-0" />
                  <span>{item.title}</span>
                </div>
                <p className="text-[#64748B] leading-relaxed pl-6">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
