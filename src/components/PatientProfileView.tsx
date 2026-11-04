import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Edit3,
  FilePlus,
  FileText,
  Lock,
  MapPin,
  Phone,
  ShieldAlert,
  Sparkles,
  User,
} from 'lucide-react';
import { Encounter, Patient, UserProfile } from '../types';
import { calculateAge } from '../data/seedData';
import { EncounterStatusBadge, PatientStatusBadge } from './StatusBadge';
import { PatientProfileSkeleton } from './SkeletonLoader';

interface PatientProfileViewProps {
  currentUser: UserProfile;
  patient: Patient;
  encounters: Encounter[];
  highlightedEncounterId?: string | null;
  isLoading?: boolean;
  onClearHighlightedEncounter?: () => void;
  onBack: () => void;
  onEditPatient: (patient: Patient) => void;
  onNewEncounter: (patientId: string) => void;
  onOpenEncounter: (encounterId: string) => void;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const PatientProfileView: React.FC<PatientProfileViewProps> = ({
  currentUser,
  patient,
  encounters,
  highlightedEncounterId = null,
  isLoading = false,
  onClearHighlightedEncounter,
  onBack,
  onEditPatient,
  onNewEncounter,
  onOpenEncounter,
}) => {
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(
    highlightedEncounterId
  );

  // Brief highlight for newly finalized or updated timeline item, then return to normal state
  useEffect(() => {
    if (!highlightedEncounterId) {
      setActiveHighlightId(null);
      return;
    }
    setActiveHighlightId(highlightedEncounterId);
    const timer = window.setTimeout(() => {
      setActiveHighlightId(null);
      if (onClearHighlightedEncounter) {
        onClearHighlightedEncounter();
      }
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [highlightedEncounterId, onClearHighlightedEncounter]);

  if (isLoading) {
    return <PatientProfileSkeleton />;
  }

  const canAccessClinicalDetails =
    currentUser.role === 'Clinician' || currentUser.role === 'Admin';

  const patientEncounters = [...encounters]
    .filter((e) => e.patientId === patient.id)
    .sort((a, b) => new Date(b.encounterDate).getTime() - new Date(a.encounterDate).getTime());

  const age = calculateAge(patient.dateOfBirth);
  const regDate = patient.createdAt.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="cb-link text-xs font-medium text-[#64748B] hover:text-[#0B1F33] gap-1.5 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span>Back to Patients Directory</span>
        </button>
      </div>

      {/* Patient Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
        className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-[#0B1F33]">
              {patient.firstName} {patient.lastName}
            </h1>
            <PatientStatusBadge status={patient.status} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B] mt-2 font-mono tabular-nums">
            <span className="font-semibold text-[#1769E0]">{patient.patientId}</span>
            <span>·</span>
            <span>DOB: {patient.dateOfBirth}</span>
            <span>·</span>
            <span>{age} yrs</span>
            <span>·</span>
            <span>{patient.sex}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onEditPatient(patient)}
            className="cb-btn cb-btn-secondary py-2 px-4 text-xs font-medium rounded-lg gap-2 whitespace-nowrap group"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#0B1F33] transition-colors" />
            <span>Edit Patient</span>
          </button>

          {canAccessClinicalDetails && (
            <button
              type="button"
              onClick={() => onNewEncounter(patient.id)}
              className="cb-btn cb-btn-primary py-2 px-4 text-xs font-medium rounded-lg gap-2 whitespace-nowrap group"
            >
              <FilePlus className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
              <span>+ New Encounter</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* Patient Information Cards (Viewport-Based Reveal Animations) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.35, delay: 0.03, ease: EASE_OUT_EXPO }}
          className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#64748B]">Contact Information</h2>
            <Phone className="w-4 h-4 text-[#1769E0]" />
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[#64748B] block">Phone Number</span>
              <span className="font-mono font-medium text-[#17212B] tabular-nums">
                {patient.phone}
              </span>
            </div>
            <div>
              <span className="text-[#64748B] block">Email Address</span>
              <span className="font-medium text-[#17212B]">{patient.email || 'Not provided'}</span>
            </div>
            <div>
              <span className="text-[#64748B] block">Residential Address</span>
              <span className="font-medium text-[#17212B] inline-flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#64748B] shrink-0 mt-0.5" />
                <span>{patient.address || 'Not provided'}</span>
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.35, delay: 0.08, ease: EASE_OUT_EXPO }}
          className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#64748B]">Registration Information</h2>
            <Calendar className="w-4 h-4 text-[#0E9F9A]" />
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[#64748B] block">Date Registered</span>
              <span className="font-mono font-medium text-[#17212B] tabular-nums">
                {regDate}
              </span>
            </div>
            <div>
              <span className="text-[#64748B] block">Emergency Contact</span>
              <span className="font-medium text-[#17212B]">
                {patient.emergencyContact || 'Not provided'}
              </span>
            </div>
            <div>
              <span className="text-[#64748B] block">Total Encounters Recorded</span>
              <span className="font-mono font-semibold text-[#0B1F33] tabular-nums">
                {patientEncounters.length}
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.35, delay: 0.13, ease: EASE_OUT_EXPO }}
          className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#64748B]">Administrative Notes</h2>
            <User className="w-4 h-4 text-[#64748B]" />
          </div>
          <p className="text-xs text-[#17212B] leading-relaxed">
            {patient.notes || 'No administrative notes recorded for this patient.'}
          </p>
        </motion.div>
      </div>

      {/* Clinical Timeline Section */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.38, ease: EASE_OUT_EXPO }}
        className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-[#0B1F33]">
              Clinical Timeline
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Chronological history of patient encounters and NONYE AI documentation status
            </p>
          </div>
          {canAccessClinicalDetails && (
            <button
              type="button"
              onClick={() => onNewEncounter(patient.id)}
              className="cb-btn cb-btn-primary py-2 px-3.5 text-xs font-medium rounded-lg gap-1.5 whitespace-nowrap group"
            >
              <FilePlus className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
              <span>+ New Encounter</span>
            </button>
          )}
        </div>

        {!canAccessClinicalDetails && (
          <div className="mx-6 mt-4 p-3.5 rounded-lg bg-[#D97706]/10 border border-[#D97706]/30 flex items-start gap-2.5 text-xs text-[#D97706]">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Role Restriction (Staff View): </span>
              <span>
                You can view encounter dates, attending clinicians, and status for administrative coordination. Full clinical notes and AI documentation review require Clinician or Admin authorization.
              </span>
            </div>
          </div>
        )}

        {patientEncounters.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
            className="p-12 text-center flex flex-col items-center justify-center"
          >
            <FileText className="w-10 h-10 text-[#64748B] mb-3" />
            <h3 className="font-display text-base font-bold text-[#0B1F33]">
              No clinical encounters on record
            </h3>
            <p className="text-xs text-[#64748B] mt-1 max-w-md">
              Start a new clinical encounter for {patient.firstName} {patient.lastName} to record consultation findings and generate structured NONYE AI documentation.
            </p>
            {canAccessClinicalDetails && (
              <button
                type="button"
                onClick={() => onNewEncounter(patient.id)}
                className="cb-btn cb-btn-primary mt-4 py-2 px-4 text-xs font-medium rounded-lg gap-1.5 whitespace-nowrap"
              >
                <FilePlus className="w-4 h-4" />
                <span>+ New Encounter</span>
              </button>
            )}
          </motion.div>
        ) : (
          <div className="p-6 space-y-4">
            <AnimatePresence initial={false}>
              {patientEncounters.map((enc, idx) => {
                const activeDoc = enc.reviewedDocumentation || enc.aiDocumentation;
                const isNewlyHighlighted = activeHighlightId === enc.id;
                return (
                  <motion.div
                    key={enc.id}
                    layout
                    initial={{ opacity: 0, y: 14, scale: 0.99 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    transition={{
                      duration: 0.34,
                      delay: isNewlyHighlighted ? 0 : idx * 0.04,
                      ease: EASE_OUT_EXPO,
                    }}
                    tabIndex={canAccessClinicalDetails ? 0 : -1}
                    role={canAccessClinicalDetails ? 'button' : undefined}
                    onKeyDown={(e) => {
                      if (canAccessClinicalDetails && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onOpenEncounter(enc.id);
                      }
                    }}
                    onClick={() => {
                      if (canAccessClinicalDetails) {
                        onOpenEncounter(enc.id);
                      }
                    }}
                    className={`rounded-xl p-5 border transition-all duration-500 group ${
                      isNewlyHighlighted
                        ? 'border-[#16A34A] bg-[#16A34A]/8 shadow-md ring-2 ring-[#16A34A]/20'
                        : canAccessClinicalDetails
                        ? 'cb-card-interactive border-[#E2E8F0] bg-white'
                        : 'border-[#E2E8F0] bg-[#F6F9FC]/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#0B1F33] tabular-nums">
                          {enc.encounterDate}
                        </span>
                        <span className="text-xs text-[#64748B]">·</span>
                        <span className="text-sm font-semibold text-[#1769E0]">
                          {enc.encounterType}
                        </span>
                        <span className="text-xs text-[#64748B]">·</span>
                        <span className="text-xs text-[#64748B]">
                          Attending: <strong className="text-[#17212B]">{enc.clinicianName}</strong>
                        </span>

                        <AnimatePresence>
                          {isNewlyHighlighted && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ duration: 0.2 }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16A34A] ml-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Newly Finalized</span>
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="flex items-center gap-3">
                        <EncounterStatusBadge status={enc.status} />
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div>
                        <span className="text-[11px] font-semibold text-[#64748B] block">
                          Reason for Visit
                        </span>
                        <p className="text-sm text-[#17212B] font-medium mt-0.5">
                          {enc.reasonForVisit || 'Not provided.'}
                        </p>
                      </div>

                      {canAccessClinicalDetails ? (
                        activeDoc ? (
                          <div className="pt-2">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0E9F9A]">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>
                                {enc.status === 'Finalized' || enc.status === 'Reviewed'
                                  ? 'Clinician-Reviewed Encounter Summary'
                                  : 'NONYE AI Draft Summary (Clinician Review Required)'}
                              </span>
                            </div>
                            <p className="text-xs text-[#17212B] mt-1 leading-relaxed">
                              {activeDoc.encounterSummary}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-[#64748B] italic pt-1">
                            Unstructured encounter notes saved as draft — click to open and generate NONYE AI documentation.
                          </p>
                        )
                      ) : (
                        <div className="pt-2 flex items-center gap-1.5 text-xs text-[#64748B]">
                          <Lock className="w-3.5 h-3.5" />
                          <span>
                            You do not have permission to access detailed clinical notes for this record.
                          </span>
                        </div>
                      )}
                    </div>

                    {canAccessClinicalDetails && (
                      <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                        <span className="text-[#64748B] font-mono tabular-nums">
                          {enc.reviewedBy
                            ? `Reviewed by ${enc.reviewedBy}`
                            : 'Clinician review required before finalization'}
                        </span>
                        <span className="cb-link font-medium gap-1">
                          <span>
                            {enc.status === 'Finalized'
                              ? 'View Finalized Documentation'
                              : 'Open & Review Documentation'}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
};
