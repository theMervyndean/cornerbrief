import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  FilePlus,
  FileText,
  Lock,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { Encounter, EncounterStatus, Patient, UserProfile } from '../types';
import { EncounterStatusBadge } from './StatusBadge';
import { Tooltip } from './Tooltip';
import { EncounterTableSkeleton } from './SkeletonLoader';

interface EncountersViewProps {
  currentUser: UserProfile;
  encounters: Encounter[];
  patients: Patient[];
  isLoading?: boolean;
  onNewEncounter: () => void;
  onOpenEncounter: (encounterId: string) => void;
  onOpenPatient: (patientId: string) => void;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const STATUS_FILTERS: ('All' | EncounterStatus)[] = [
  'All',
  'Pending Review',
  'AI Generated',
  'Reviewed',
  'Finalized',
  'Draft',
];

export const EncountersView: React.FC<EncountersViewProps> = ({
  currentUser,
  encounters,
  patients,
  isLoading = false,
  onNewEncounter,
  onOpenEncounter,
  onOpenPatient,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | EncounterStatus>('All');

  const canAccessClinicalDetails =
    currentUser.role === 'Clinician' || currentUser.role === 'Admin';

  const getPatient = (patientId: string) =>
    patients.find((p) => p.id === patientId);

  const filteredEncounters = [...encounters]
    .sort((a, b) => new Date(b.encounterDate).getTime() - new Date(a.encounterDate).getTime())
    .filter((enc) => {
      if (statusFilter !== 'All' && enc.status !== statusFilter) return false;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      const pat = getPatient(enc.patientId);
      const patientName = pat ? `${pat.firstName} ${pat.lastName}`.toLowerCase() : '';
      const patientCode = pat ? pat.patientId.toLowerCase() : '';
      return (
        patientName.includes(q) ||
        patientCode.includes(q) ||
        enc.encounterType.toLowerCase().includes(q) ||
        enc.reasonForVisit.toLowerCase().includes(q) ||
        enc.clinicianName.toLowerCase().includes(q)
      );
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
        className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-xl font-bold text-[#0B1F33]">
            Clinical Encounters
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Track encounter documentation status from Draft and NONYE AI generation through Clinician Review and Finalization.
          </p>
        </div>

        {canAccessClinicalDetails && (
          <button
            type="button"
            onClick={onNewEncounter}
            className="cb-btn cb-btn-primary py-2 px-4 text-xs font-medium rounded-lg gap-2 whitespace-nowrap group"
          >
            <FilePlus className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
            <span>+ New Encounter</span>
          </button>
        )}
      </motion.div>

      {/* Search & Status Filter */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.04, ease: EASE_OUT_EXPO }}
        className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4"
      >
        <div className="relative flex-1 group">
          <Search className="w-4 h-4 text-[#64748B] group-focus-within:text-[#1769E0] transition-colors duration-150 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search encounters by patient name, Patient ID, visit type, or clinician..."
            className="cb-input w-full pl-10 pr-9 py-2 text-sm rounded-lg"
          />
          {searchQuery && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <Tooltip content="Clear search">
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="cb-icon-btn p-1 rounded-md text-[#64748B] hover:text-[#17212B] hover:bg-slate-200/60"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#F6F9FC] border border-[#E2E8F0] rounded-lg overflow-x-auto">
          {STATUS_FILTERS.map((status) => {
            const active = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`relative px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                  active
                    ? 'text-[#0B1F33]'
                    : 'text-[#64748B] hover:text-[#17212B]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="encountersFilterTabIndicator"
                    transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
                    className="absolute inset-0 bg-white rounded-md shadow-xs border border-[#E2E8F0]"
                  />
                )}
                <span className="relative z-10">{status}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Encounters Table / Skeleton / Empty State */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.35, delay: 0.08, ease: EASE_OUT_EXPO }}
        className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden"
      >
        {isLoading ? (
          <EncounterTableSkeleton />
        ) : filteredEncounters.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
            className="p-12 text-center flex flex-col items-center justify-center"
          >
            <FileText className="w-10 h-10 text-[#64748B] mb-3" />
            <h3 className="font-display text-base font-bold text-[#0B1F33]">
              No clinical encounters match your filter
            </h3>
            <p className="text-xs text-[#64748B] mt-1 max-w-md">
              Try clearing your search filter or create a new clinical encounter.
            </p>
            {canAccessClinicalDetails && (
              <button
                type="button"
                onClick={onNewEncounter}
                className="cb-btn cb-btn-primary mt-4 py-2 px-4 text-xs font-medium rounded-lg gap-1.5 whitespace-nowrap"
              >
                <FilePlus className="w-4 h-4" />
                <span>+ New Encounter</span>
              </button>
            )}
          </motion.div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F6F9FC] text-[11px] font-semibold text-[#64748B]">
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Patient</th>
                  <th className="py-3 px-5">Encounter Type</th>
                  <th className="py-3 px-5">Reason for Visit</th>
                  <th className="py-3 px-5">Clinician</th>
                  <th className="py-3 px-5">Documentation Status</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {filteredEncounters.map((enc) => {
                  const pat = getPatient(enc.patientId);
                  return (
                    <tr
                      key={enc.id}
                      onClick={() => {
                        if (canAccessClinicalDetails) {
                          onOpenEncounter(enc.id);
                        } else if (pat) {
                          onOpenPatient(pat.id);
                        }
                      }}
                      className="cb-table-row group"
                    >
                      <td className="py-3.5 px-5 font-mono text-xs text-[#0B1F33] font-semibold tabular-nums whitespace-nowrap">
                        {enc.encounterDate}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="font-semibold text-[#0B1F33] group-hover:text-[#1769E0] transition-colors duration-150">
                          {pat ? `${pat.firstName} ${pat.lastName}` : 'Unknown Patient'}
                        </div>
                        <div className="text-xs font-mono text-[#64748B] tabular-nums">
                          {pat?.patientId || enc.patientId}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-xs font-medium text-[#17212B] whitespace-nowrap">
                        {enc.encounterType}
                      </td>
                      <td className="py-3.5 px-5 text-xs text-[#64748B] max-w-xs truncate">
                        {enc.reasonForVisit || 'Not provided.'}
                      </td>
                      <td className="py-3.5 px-5 text-xs text-[#17212B] whitespace-nowrap">
                        {enc.clinicianName}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <EncounterStatusBadge status={enc.status} />
                      </td>
                      <td
                        className="py-3.5 px-5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {canAccessClinicalDetails ? (
                          <button
                            type="button"
                            onClick={() => onOpenEncounter(enc.id)}
                            className="cb-btn cb-btn-secondary py-1.5 px-3 text-xs font-medium rounded-lg gap-1.5 whitespace-nowrap group/btn"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#0E9F9A] transition-transform duration-200 group-hover/btn:scale-110" />
                            <span>
                              {enc.status === 'Finalized' ? 'View Record' : 'Review / Edit'}
                            </span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-[#64748B]">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Clinician Only</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
};
