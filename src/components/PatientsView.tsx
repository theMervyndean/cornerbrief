import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Eye,
  EyeOff,
  FilePlus,
  Plus,
  Search,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Patient, PatientStatus, UserProfile } from '../types';
import { calculateAge, maskPhoneNumber } from '../data/seedData';
import { PatientStatusBadge } from './StatusBadge';
import { Tooltip } from './Tooltip';
import { PatientTableSkeleton } from './SkeletonLoader';

interface PatientsViewProps {
  currentUser: UserProfile;
  patients: Patient[];
  isLoading?: boolean;
  onNewPatient: () => void;
  onOpenPatient: (patientId: string) => void;
  onNewEncounterForPatient: (patientId: string) => void;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const PatientsView: React.FC<PatientsViewProps> = ({
  currentUser,
  patients,
  isLoading = false,
  onNewPatient,
  onOpenPatient,
  onNewEncounterForPatient,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | PatientStatus>('All');
  const [revealContact, setRevealContact] = useState(false);

  const canCreateEncounter = currentUser.role === 'Clinician' || currentUser.role === 'Admin';

  const filteredPatients = patients.filter((patient) => {
    const matchesStatus = statusFilter === 'All' || patient.status === statusFilter;
    if (!matchesStatus) return false;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;

    const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
    const idMatch = patient.patientId.toLowerCase().includes(q);
    const phoneMatch = patient.phone.toLowerCase().includes(q);

    return fullName.includes(q) || idMatch || phoneMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header & Primary Action */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-[#E2E8F0] rounded-xl p-6"
      >
        <div>
          <h1 className="font-display text-xl font-bold text-[#0B1F33]">
            Patient Directory
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Search by patient name, Patient ID, or phone number. Contact details are masked by default for clinical privacy.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Tooltip
            content={
              revealContact
                ? 'Hide full phone numbers in directory table'
                : 'Temporarily reveal unmasked phone numbers'
            }
          >
            <button
              type="button"
              onClick={() => setRevealContact((prev) => !prev)}
              className="cb-btn cb-btn-secondary py-2 px-3 text-xs font-medium rounded-lg gap-1.5 whitespace-nowrap group"
            >
              {revealContact ? (
                <EyeOff className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#0B1F33] transition-colors" />
              ) : (
                <Eye className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#0B1F33] transition-colors" />
              )}
              <span>{revealContact ? 'Mask Phone Numbers' : 'Show Full Phone Numbers'}</span>
            </button>
          </Tooltip>

          <button
            type="button"
            onClick={onNewPatient}
            className="cb-btn cb-btn-primary py-2 px-4 text-xs font-medium rounded-lg gap-2 whitespace-nowrap group"
          >
            <Plus className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
            <span>+ New Patient</span>
          </button>
        </div>
      </motion.div>

      {/* Search & Status Filters */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.04, ease: EASE_OUT_EXPO }}
        className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4"
      >
        <div className="relative flex-1 group">
          <Search className="w-4 h-4 text-[#64748B] group-focus-within:text-[#1769E0] transition-colors duration-150 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by patient name, Patient ID (e.g. CB-NG-2026-1041), or phone number..."
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
          {(['All', 'Active', 'Follow-Up', 'Discharged'] as const).map((tab) => {
            const active = statusFilter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`relative px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                  active
                    ? 'text-[#0B1F33]'
                    : 'text-[#64748B] hover:text-[#17212B]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="patientsFilterTabIndicator"
                    transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
                    className="absolute inset-0 bg-white rounded-md shadow-xs border border-[#E2E8F0]"
                  />
                )}
                <span className="relative z-10">{tab}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Patient Records Table / Skeleton / Empty State */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.35, delay: 0.08, ease: EASE_OUT_EXPO }}
        className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden"
      >
        {isLoading ? (
          <PatientTableSkeleton />
        ) : filteredPatients.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
            className="p-12 text-center flex flex-col items-center justify-center"
          >
            <Users className="w-10 h-10 text-[#64748B] mb-3" />
            <h3 className="font-display text-base font-bold text-[#0B1F33]">
              No matching patient records found
            </h3>
            <p className="text-xs text-[#64748B] mt-1 max-w-md">
              {searchQuery || statusFilter !== 'All'
                ? 'Try clearing your search query or switching the status filter.'
                : 'Register your first synthetic patient to begin managing clinical encounters.'}
            </p>
            <div className="mt-4 flex items-center gap-3">
              {(searchQuery || statusFilter !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('All');
                  }}
                  className="cb-btn cb-btn-secondary py-2 px-4 text-xs font-medium rounded-lg whitespace-nowrap"
                >
                  Reset Filters
                </button>
              )}
              <button
                type="button"
                onClick={onNewPatient}
                className="cb-btn cb-btn-primary py-2 px-4 text-xs font-medium rounded-lg gap-1.5 whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register Patient</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F6F9FC] text-[11px] font-semibold text-[#64748B]">
                  <th className="py-3 px-5">Patient ID</th>
                  <th className="py-3 px-5">Patient Name</th>
                  <th className="py-3 px-5">Age / Sex</th>
                  <th className="py-3 px-5">Phone (Privacy Protected)</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Registered</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {filteredPatients.map((patient) => {
                  const regDate = patient.createdAt.slice(0, 10);
                  return (
                    <tr
                      key={patient.id}
                      onClick={() => onOpenPatient(patient.id)}
                      className="cb-table-row group"
                    >
                      <td className="py-3.5 px-5 font-mono text-xs font-semibold text-[#1769E0] tabular-nums whitespace-nowrap">
                        {patient.patientId}
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-[#0B1F33] group-hover:text-[#1769E0] transition-colors duration-150 whitespace-nowrap">
                        {patient.firstName} {patient.lastName}
                      </td>
                      <td className="py-3.5 px-5 text-xs text-[#64748B] font-mono tabular-nums whitespace-nowrap">
                        {calculateAge(patient.dateOfBirth)} yrs · {patient.sex}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-xs text-[#17212B] tabular-nums whitespace-nowrap">
                        {revealContact ? patient.phone : maskPhoneNumber(patient.phone)}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <PatientStatusBadge status={patient.status} />
                      </td>
                      <td className="py-3.5 px-5 font-mono text-xs text-[#64748B] tabular-nums whitespace-nowrap">
                        {regDate}
                      </td>
                      <td
                        className="py-3.5 px-5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenPatient(patient.id)}
                            className="cb-btn cb-btn-secondary py-1.5 px-3 text-xs font-medium rounded-lg whitespace-nowrap"
                          >
                            Open Profile
                          </button>
                          {canCreateEncounter && (
                            <Tooltip content="Record a new clinical encounter for this patient" side="left">
                              <button
                                type="button"
                                onClick={() => onNewEncounterForPatient(patient.id)}
                                className="cb-btn cb-btn-primary py-1.5 px-3 text-xs font-medium rounded-lg gap-1 whitespace-nowrap"
                              >
                                <FilePlus className="w-3.5 h-3.5" />
                                <span>Encounter</span>
                              </button>
                            </Tooltip>
                          )}
                        </div>
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
