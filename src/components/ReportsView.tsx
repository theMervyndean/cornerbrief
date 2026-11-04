import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { AuditLog, Encounter, Patient, UserProfile } from '../types';
import { Tooltip } from './Tooltip';

interface ReportsViewProps {
  currentUser: UserProfile;
  patients: Patient[];
  encounters: Encounter[];
  auditLogs: AuditLog[];
  onOpenPatient: (patientId: string) => void;
  onOpenEncounter: (encounterId: string) => void;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const ReportsView: React.FC<ReportsViewProps> = ({
  currentUser,
  patients,
  encounters,
  auditLogs,
  onOpenPatient,
  onOpenEncounter,
}) => {
  const [auditSearch, setAuditSearch] = useState('');

  const canAccessClinicalDetails =
    currentUser.role === 'Clinician' || currentUser.role === 'Admin';

  const totalEncounters = encounters.length;
  const finalizedCount = encounters.filter((e) => e.status === 'Finalized').length;
  const reviewedCount = encounters.filter((e) => e.status === 'Reviewed').length;
  const pendingCount = encounters.filter(
    (e) => e.status === 'Pending Review' || e.status === 'AI Generated' || e.status === 'Draft'
  ).length;

  const finalizationRate =
    totalEncounters > 0 ? Math.round((finalizedCount / totalEncounters) * 100) : 0;

  const getPatientLabel = (patientId: string) => {
    if (!patientId) return '—';
    const pat = patients.find((p) => p.id === patientId);
    return pat ? `${pat.firstName} ${pat.lastName} (${pat.patientId})` : patientId;
  };

  const sortedAuditLogs = [...auditLogs]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .filter((log) => {
      const q = auditSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        log.userName.toLowerCase().includes(q) ||
        log.userRole.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        getPatientLabel(log.patientId).toLowerCase().includes(q)
      );
    });

  const reportCards = [
    {
      label: 'Finalization Rate',
      value: `${finalizationRate}%`,
      subtext: `${finalizedCount} of ${totalEncounters} encounters finalized`,
      Icon: CheckCircle2,
      iconColor: 'text-[#16A34A]',
      monoSub: true,
    },
    {
      label: 'Pending Review',
      value: pendingCount,
      subtext: 'Requires clinician sign-off',
      Icon: Clock,
      iconColor: 'text-[#D97706]',
      monoSub: false,
    },
    {
      label: 'Reviewed (Unfinalized)',
      value: reviewedCount,
      subtext: 'Edited by clinician, ready to finalize',
      Icon: ClipboardCheck,
      iconColor: 'text-[#1769E0]',
      monoSub: false,
    },
    {
      label: 'Audit Trail Events',
      value: auditLogs.length,
      subtext: 'Append-only clinical governance events',
      Icon: ShieldCheck,
      iconColor: 'text-[#0E9F9A]',
      monoSub: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
        className="bg-white border border-[#E2E8F0] rounded-xl p-6"
      >
        <h1 className="font-display text-xl font-bold text-[#0B1F33]">
          Clinical Documentation Reports &amp; Audit Trail
        </h1>
        <p className="text-xs text-[#64748B] mt-1">
          Real-time documentation quality metrics and immutable clinical governance audit log.
        </p>
      </motion.div>

      {/* Summary Metrics (Viewport-Based Staggered Reveal) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportCards.map((card, idx) => {
          const Icon = card.Icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.34,
                delay: idx * 0.05,
                ease: EASE_OUT_EXPO,
              }}
              className="bg-white border border-[#E2E8F0] rounded-xl p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">{card.label}</span>
                <Icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
              <div className="mt-3 font-mono text-2xl font-bold text-[#0B1F33] tabular-nums">
                {card.value}
              </div>
              <p
                className={`mt-1 text-xs text-[#64748B] ${
                  card.monoSub ? 'font-mono tabular-nums' : ''
                }`}
              >
                {card.subtext}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Audit Trail Section */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.38, delay: 0.08, ease: EASE_OUT_EXPO }}
        className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-[#0B1F33]">
              Clinical &amp; Administrative Audit Log
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Tracks user, action, date/time, patient affected, and encounter affected. Finalized clinical records cannot be silently overwritten.
            </p>
          </div>

          <div className="relative w-full sm:w-72 group">
            <Search className="w-4 h-4 text-[#64748B] group-focus-within:text-[#1769E0] transition-colors duration-150 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Filter audit trail..."
              className="cb-input w-full pl-9 pr-8 py-1.5 text-xs rounded-lg"
            />
            {auditSearch && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Tooltip content="Clear filter">
                  <button
                    type="button"
                    onClick={() => setAuditSearch('')}
                    className="cb-icon-btn p-1 rounded-md text-[#64748B] hover:text-[#17212B]"
                    aria-label="Clear filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              </div>
            )}
          </div>
        </div>

        {sortedAuditLogs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
            className="p-10 text-center"
          >
            <FileText className="w-8 h-8 text-[#64748B] mx-auto mb-2" />
            <p className="text-sm font-medium text-[#0B1F33]">No audit log entries found</p>
          </motion.div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F6F9FC] text-[11px] font-semibold text-[#64748B]">
                  <th className="py-3 px-5">Timestamp (UTC)</th>
                  <th className="py-3 px-5">User &amp; Role</th>
                  <th className="py-3 px-5">Action</th>
                  <th className="py-3 px-5">Patient Affected</th>
                  <th className="py-3 px-5">Encounter Affected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {sortedAuditLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="transition-colors duration-150 hover:bg-[#F6F9FC]"
                  >
                    <td className="py-3 px-5 font-mono text-[#64748B] tabular-nums whitespace-nowrap">
                      {log.timestamp.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="py-3 px-5 whitespace-nowrap">
                      <span className="font-semibold text-[#0B1F33]">{log.userName}</span>
                      <span className="text-[#64748B]"> · {log.userRole}</span>
                    </td>
                    <td className="py-3 px-5 text-[#17212B] font-medium">
                      {log.action}
                    </td>
                    <td className="py-3 px-5 whitespace-nowrap">
                      {log.patientId ? (
                        <button
                          type="button"
                          onClick={() => onOpenPatient(log.patientId)}
                          className="cb-link font-medium"
                        >
                          {getPatientLabel(log.patientId)}
                        </button>
                      ) : (
                        <span className="text-[#64748B]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-5 font-mono tabular-nums whitespace-nowrap">
                      {log.encounterId ? (
                        canAccessClinicalDetails ? (
                          <button
                            type="button"
                            onClick={() => onOpenEncounter(log.encounterId)}
                            className="cb-link text-[#0E9F9A] hover:text-[#0B8480] font-medium"
                          >
                            {log.encounterId}
                          </button>
                        ) : (
                          <span className="text-[#64748B]">{log.encounterId}</span>
                        )
                      ) : (
                        <span className="text-[#64748B]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
};
