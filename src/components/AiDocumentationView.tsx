import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Edit3,
  FilePlus,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  Encounter,
  EncounterStatus,
  OriginalEncounterInput,
  Patient,
  StructuredAiDocumentation,
  UserProfile,
} from '../types';
import { calculateAge } from '../data/seedData';
import { EncounterStatusBadge } from './StatusBadge';
import { Tooltip } from './Tooltip';

interface AiDocumentationViewProps {
  currentUser: UserProfile;
  encounters: Encounter[];
  patients: Patient[];
  selectedEncounterId: string | null;
  externalGeneratingEncounterId?: string | null;
  onSelectEncounter: (encounterId: string) => void;
  onNewEncounter: () => void;
  onOpenPatient: (patientId: string) => void;
  onGenerateAiForEncounter: (
    encounterId: string,
    updatedOriginalInput?: OriginalEncounterInput
  ) => Promise<void>;
  onSaveReviewedDocumentation: (
    encounterId: string,
    reviewedDoc: StructuredAiDocumentation,
    finalize: boolean
  ) => Promise<void>;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const ARRAY_SECTIONS: {
  key: keyof Pick<
    StructuredAiDocumentation,
    | 'relevantHistory'
    | 'medications'
    | 'allergies'
    | 'investigations'
    | 'clinicalNotes'
    | 'followUpItems'
    | 'missingInformation'
  >;
  label: string;
  helper: string;
}[] = [
  {
    key: 'relevantHistory',
    label: 'Relevant History',
    helper: 'Relevant history explicitly contained in the encounter input.',
  },
  {
    key: 'medications',
    label: 'Medications',
    helper: 'Medications explicitly mentioned. NONYE AI never prescribes or adds dosages.',
  },
  {
    key: 'allergies',
    label: 'Allergies',
    helper: 'Drug, food, or environmental allergies explicitly mentioned.',
  },
  {
    key: 'investigations',
    label: 'Investigations',
    helper: 'Laboratory, vital sign, or diagnostic findings supplied by the clinician.',
  },
  {
    key: 'clinicalNotes',
    label: 'Clinical Notes',
    helper: 'Organized clinician observations and examination notes.',
  },
  {
    key: 'followUpItems',
    label: 'Follow-Up Items',
    helper: 'Follow-up actions explicitly stated by the clinician.',
  },
  {
    key: 'missingInformation',
    label: 'Missing Information',
    helper: 'Documentation fields identified as incomplete or unrecorded.',
  },
];

export const AiDocumentationView: React.FC<AiDocumentationViewProps> = ({
  currentUser,
  encounters,
  patients,
  selectedEncounterId,
  externalGeneratingEncounterId = null,
  onSelectEncounter,
  onNewEncounter,
  onOpenPatient,
  onGenerateAiForEncounter,
  onSaveReviewedDocumentation,
}) => {
  const canAccessAiWorkspace =
    currentUser.role === 'Clinician' || currentUser.role === 'Admin';

  const currentEncounter =
    encounters.find((e) => e.id === selectedEncounterId) || encounters[0] || null;

  const patient = currentEncounter
    ? patients.find((p) => p.id === currentEncounter.patientId)
    : null;

  const isFinalized = currentEncounter?.status === 'Finalized';

  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [isEditingOriginal, setIsEditingOriginal] = useState(false);
  const [originalDraft, setOriginalDraft] = useState<OriginalEncounterInput | null>(null);
  const [docDraft, setDocDraft] = useState<StructuredAiDocumentation | null>(null);
  const [confirmClinicianReview, setConfirmClinicianReview] = useState(false);

  const [isGeneratingLocal, setIsGeneratingLocal] = useState(false);
  const [savingAction, setSavingAction] = useState<'review' | 'finalize' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<{
    message: string;
    fromStatus?: EncounterStatus;
    toStatus?: EncounterStatus;
    isFinalizedAction?: boolean;
  } | null>(null);
  const [revealGenerationCount, setRevealGenerationCount] = useState<number>(0);

  const isGenerating =
    isGeneratingLocal ||
    (Boolean(currentEncounter) && externalGeneratingEncounterId === currentEncounter?.id);

  const isSaving = savingAction !== null;

  useEffect(() => {
    setError(null);
    setSuccessBanner(null);
    setConfirmClinicianReview(false);
    setIsEditingOriginal(false);

    if (!currentEncounter) {
      setDocDraft(null);
      setOriginalDraft(null);
      return;
    }

    setOriginalDraft({ ...currentEncounter.originalInput });

    const sourceDoc =
      currentEncounter.reviewedDocumentation || currentEncounter.aiDocumentation || null;

    if (sourceDoc) {
      setDocDraft({
        encounterSummary: sourceDoc.encounterSummary,
        presentingConcern: sourceDoc.presentingConcern,
        relevantHistory: [...sourceDoc.relevantHistory],
        medications: [...sourceDoc.medications],
        allergies: [...sourceDoc.allergies],
        investigations: [...sourceDoc.investigations],
        clinicalNotes: [...sourceDoc.clinicalNotes],
        followUpItems: [...sourceDoc.followUpItems],
        missingInformation: [...sourceDoc.missingInformation],
        requiresReview: sourceDoc.requiresReview,
      });
      setIsEditingDoc(currentEncounter.status !== 'Finalized');
      setRevealGenerationCount((prev) => prev + 1);
    } else {
      setDocDraft(null);
      setIsEditingDoc(false);
    }
  }, [currentEncounter?.id, currentEncounter?.updatedAt, currentEncounter?.status]);

  if (!canAccessAiWorkspace) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
        className="bg-white border border-[#E2E8F0] rounded-xl p-8 text-center max-w-lg mx-auto my-8"
      >
        <ShieldAlert className="w-10 h-10 text-[#DC2626] mx-auto mb-3" />
        <h2 className="font-display text-lg font-bold text-[#0B1F33]">
          You do not have permission to access this record.
        </h2>
        <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
          AI clinical documentation generation, editing, and record finalization are restricted to authorized <strong>Clinician</strong> and <strong>Admin</strong> users.
        </p>
      </motion.div>
    );
  }

  if (!currentEncounter) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
        className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center"
      >
        <Sparkles className="w-10 h-10 text-[#0E9F9A] mx-auto mb-3" />
        <h2 className="font-display text-lg font-bold text-[#0B1F33]">
          No Clinical Encounters Available
        </h2>
        <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
          Create a clinical encounter first to organize unstructured consultation notes with NONYE AI.
        </p>
        <button
          type="button"
          onClick={onNewEncounter}
          className="cb-btn cb-btn-primary mt-4 py-2 px-4 text-xs font-medium rounded-lg gap-1.5"
        >
          <FilePlus className="w-4 h-4" />
          <span>+ New Encounter</span>
        </button>
      </motion.div>
    );
  }

  const handleRegenerate = async () => {
    if (isFinalized) return;
    const prevStatus = currentEncounter.status;
    setError(null);
    setSuccessBanner(null);
    setIsGeneratingLocal(true);
    try {
      await onGenerateAiForEncounter(
        currentEncounter.id,
        isEditingOriginal && originalDraft ? originalDraft : undefined
      );
      setIsEditingOriginal(false);
      setSuccessBanner({
        message:
          'NONYE AI structured documentation generated. Please review and edit before saving.',
        fromStatus: prevStatus,
        toStatus: 'Pending Review',
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to generate documentation. Please try again.'
      );
    } finally {
      setIsGeneratingLocal(false);
    }
  };

  const handleSaveReviewed = async (finalize: boolean) => {
    if (!docDraft || isFinalized) return;
    setError(null);
    setSuccessBanner(null);

    if (finalize && !confirmClinicianReview) {
      setError(
        'Clinician Review Required: Please confirm the clinical review attestation checkbox before finalizing this medical record.'
      );
      return;
    }

    const previousStatus = currentEncounter.status;
    const targetStatus: EncounterStatus = finalize ? 'Finalized' : 'Reviewed';
    setSavingAction(finalize ? 'finalize' : 'review');

    try {
      await onSaveReviewedDocumentation(
        currentEncounter.id,
        {
          ...docDraft,
          requiresReview: !finalize,
        },
        finalize
      );
      setSuccessBanner({
        message: finalize
          ? 'Clinical documentation finalized and locked in the patient timeline.'
          : 'Reviewed documentation saved. You can continue editing or finalize when ready.',
        fromStatus: previousStatus,
        toStatus: targetStatus,
        isFinalizedAction: finalize,
      });
      if (finalize) {
        setIsEditingDoc(false);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to save documentation. Please try again.'
      );
    } finally {
      setSavingAction(null);
    }
  };

  const updateArrayItem = (
    sectionKey: typeof ARRAY_SECTIONS[number]['key'],
    index: number,
    value: string
  ) => {
    if (!docDraft) return;
    const updated = [...docDraft[sectionKey]];
    updated[index] = value;
    setDocDraft({ ...docDraft, [sectionKey]: updated });
  };

  const addArrayItem = (sectionKey: typeof ARRAY_SECTIONS[number]['key']) => {
    if (!docDraft) return;
    const currentList =
      docDraft[sectionKey].length === 1 && docDraft[sectionKey][0] === 'Not provided.'
        ? []
        : [...docDraft[sectionKey]];
    setDocDraft({ ...docDraft, [sectionKey]: [...currentList, ''] });
  };

  const removeArrayItem = (
    sectionKey: typeof ARRAY_SECTIONS[number]['key'],
    index: number
  ) => {
    if (!docDraft) return;
    const updated = docDraft[sectionKey].filter((_, i) => i !== index);
    setDocDraft({
      ...docDraft,
      [sectionKey]: updated.length > 0 ? updated : ['Not provided.'],
    });
  };

  return (
    <div className="space-y-5">
      {/* Top Encounter Switcher & Navigation Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {patient && (
            <button
              type="button"
              onClick={() => onOpenPatient(patient.id)}
              className="cb-link text-xs font-medium gap-1 group"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
              <span>
                {patient.firstName} {patient.lastName} ({patient.patientId})
              </span>
            </button>
          )}
          <span className="text-xs text-[#64748B]">·</span>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-[#64748B] whitespace-nowrap">
              Active Encounter:
            </label>
            <select
              value={currentEncounter.id}
              onChange={(e) => onSelectEncounter(e.target.value)}
              className="cb-input px-3 py-1.5 text-xs font-medium text-[#0B1F33] rounded-lg"
            >
              {encounters.map((enc) => {
                const pat = patients.find((p) => p.id === enc.patientId);
                return (
                  <option key={enc.id} value={enc.id}>
                    {enc.encounterDate} — {pat ? `${pat.firstName} ${pat.lastName}` : 'Patient'} ({enc.encounterType} · {enc.status})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <EncounterStatusBadge status={currentEncounter.status} />
          <button
            type="button"
            onClick={onNewEncounter}
            className="cb-btn cb-btn-secondary py-1.5 px-3 text-xs font-medium rounded-lg gap-1.5 whitespace-nowrap group"
          >
            <FilePlus className="w-3.5 h-3.5 text-[#1769E0] transition-transform duration-200 group-hover:scale-110" />
            <span>+ New Encounter</span>
          </button>
        </div>
      </div>

      {/* Mandatory AI Safety Notice Banner & Clinician Review Required Emphasis */}
      <div className="bg-[#0B1F33] text-white rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#0E9F9A] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs sm:text-sm font-semibold text-white">
              AI-generated documentation. Review carefully and edit as needed before saving to the patient&apos;s clinical record.
            </p>
            <p className="text-[11px] text-slate-300 mt-0.5">
              NONYE AI is a documentation and organization assistant. It does not diagnose, prescribe, recommend dosages, or replace a healthcare professional.
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {!isFinalized ? (
            <motion.div
              key="review-required"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
              className="cb-review-required-badge inline-flex items-center gap-2 text-xs font-semibold text-[#D97706] bg-white border border-[#D97706]/50 px-3.5 py-1.5 rounded-lg shrink-0 whitespace-nowrap"
            >
              <span className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse" />
              <span>Clinician Review Required</span>
            </motion.div>
          ) : (
            <motion.div
              key="record-locked"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16A34A] bg-white px-3.5 py-1.5 rounded-lg shrink-0 whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Finalized Clinical Record (Locked)</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error & Save/Completion Feedback Banners */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
            className="p-3.5 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/30 flex items-start gap-2.5 text-xs text-[#DC2626]"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {successBanner && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99 }}
            transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
            className="p-4 rounded-xl bg-[#16A34A]/10 border border-[#16A34A]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#16A34A]"
          >
            <div className="flex items-start sm:items-center gap-2.5">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              </motion.div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[#0B1F33]">
                  {successBanner.message}
                </span>
                {successBanner.fromStatus &&
                  successBanner.toStatus &&
                  successBanner.fromStatus !== successBanner.toStatus && (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#17212B] bg-white px-2.5 py-0.5 rounded-md border border-[#16A34A]/30">
                      <span>{successBanner.fromStatus}</span>
                      <ArrowRight className="w-3 h-3 text-[#16A34A]" />
                      <strong className="text-[#16A34A]">{successBanner.toStatus}</strong>
                    </span>
                  )}
              </div>
            </div>

            {successBanner.isFinalizedAction && patient && (
              <button
                type="button"
                onClick={() => onOpenPatient(patient.id)}
                className="cb-btn cb-btn-secondary bg-white py-1.5 px-3 text-xs font-semibold text-[#0B1F33] rounded-lg gap-1.5 whitespace-nowrap shrink-0 group"
              >
                <span>View in Patient Timeline</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#1769E0] transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Split Workspace: LEFT (Original Encounter Information) | RIGHT (NONYE AI Generated Documentation) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT SIDE: Preserved Original Encounter Information */}
        <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#F6F9FC] flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-bold text-[#0B1F33]">
                Original Encounter Information
              </h2>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                Preserved clinician-entered notes · {currentEncounter.encounterDate}
              </p>
            </div>

            {!isFinalized && (
              <Tooltip
                content={
                  isEditingOriginal
                    ? 'Finish editing original clinical notes'
                    : 'Modify clinician input before regenerating AI documentation'
                }
                side="left"
              >
                <button
                  type="button"
                  onClick={() => setIsEditingOriginal((prev) => !prev)}
                  disabled={isGenerating || isSaving}
                  className="cb-btn py-1 px-2.5 text-xs font-medium text-[#1769E0] bg-white hover:bg-[#1769E0]/10 border border-[#E2E8F0] rounded-md gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingOriginal ? 'Done Editing Input' : 'Edit Input'}</span>
                </button>
              </Tooltip>
            )}
          </div>

          <div className="p-5 space-y-4 text-xs">
            {/* Patient Demographic Summary */}
            {patient && (
              <div className="pb-3 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-[#64748B] font-mono tabular-nums">
                <span>
                  <strong className="text-[#0B1F33] font-sans">
                    {patient.firstName} {patient.lastName}
                  </strong>{' '}
                  · {patient.patientId}
                </span>
                <span>
                  {calculateAge(patient.dateOfBirth)} yrs · {patient.sex}
                </span>
              </div>
            )}

            {[
              { key: 'reasonForVisit', label: 'Reason for Visit' },
              { key: 'patientReportedInfo', label: 'Patient-Reported Information' },
              { key: 'relevantHistory', label: 'Relevant History' },
              { key: 'currentMedications', label: 'Current Medications' },
              { key: 'allergies', label: 'Allergies' },
              { key: 'investigations', label: 'Investigations / Lab Information' },
              { key: 'clinicianObservations', label: 'Clinician Observations' },
              { key: 'additionalNotes', label: 'Additional Notes' },
            ].map((field) => {
              const fieldKey = field.key as keyof OriginalEncounterInput;
              const val = originalDraft ? originalDraft[fieldKey] : '';
              return (
                <div key={field.key} className="space-y-1">
                  <label className="block text-[11px] font-semibold text-[#64748B]">
                    {field.label}
                  </label>
                  {isEditingOriginal && !isFinalized && originalDraft ? (
                    <textarea
                      rows={2}
                      value={val}
                      onChange={(e) =>
                        setOriginalDraft({
                          ...originalDraft,
                          [fieldKey]: e.target.value,
                        })
                      }
                      className="cb-input w-full px-3 py-1.5 text-xs rounded-lg"
                    />
                  ) : (
                    <div className="p-2.5 rounded-lg bg-[#F6F9FC] border border-[#E2E8F0]/70 text-[#17212B] leading-relaxed whitespace-pre-wrap">
                      {val ? (
                        val
                      ) : (
                        <span className="text-[#64748B] italic">Not provided.</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT SIDE: NONYE AI — Generated Documentation & Human Review */}
        <div
          className={`lg:col-span-7 bg-white border rounded-xl overflow-hidden transition-colors duration-300 ${
            isGenerating
              ? 'border-[#0E9F9A] shadow-md'
              : 'border-[#E2E8F0]'
          }`}
        >
          <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#0E9F9A]/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-lg bg-[#0E9F9A] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs transition-transform duration-300 ${
                  isGenerating ? 'scale-105' : ''
                }`}
              >
                <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-sm font-bold text-[#0B1F33]">
                    NONYE AI — Generated Documentation
                  </h2>
                  <span className="text-xs font-medium text-[#0E9F9A]">
                    · Documentation Assistant
                  </span>
                </div>
                <p className="text-xs text-[#64748B] italic mt-0.5">
                  {isGenerating
                    ? 'Organizing clinical information...'
                    : '“Your encounter information has been organized. Please review the generated documentation before saving.”'}
                </p>
              </div>
            </div>

            {!isFinalized && (
              <div className="flex items-center gap-2 shrink-0">
                <Tooltip content="Re-run NONYE AI on the preserved encounter input">
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={isGenerating || isSaving}
                    className="cb-btn py-1.5 px-3 text-xs font-medium text-[#0E9F9A] bg-white hover:bg-[#0E9F9A]/10 border border-[#0E9F9A]/40 rounded-lg gap-1.5 whitespace-nowrap group"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-180" />
                    )}
                    <span>{isGenerating ? 'Organizing...' : 'Regenerate'}</span>
                  </button>
                </Tooltip>

                {docDraft && !isGenerating && (
                  <Tooltip
                    content={
                      isEditingDoc
                        ? 'Switch to formatted preview mode'
                        : 'Edit structured sections inline'
                    }
                    side="left"
                  >
                    <button
                      type="button"
                      onClick={() => setIsEditingDoc((prev) => !prev)}
                      className={`cb-btn py-1.5 px-3 text-xs font-medium rounded-lg border gap-1.5 whitespace-nowrap ${
                        isEditingDoc
                          ? 'bg-[#0B1F33] text-white border-[#0B1F33]'
                          : 'bg-white text-[#0B1F33] border-[#E2E8F0] hover:bg-[#F6F9FC]'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isEditingDoc ? 'Preview Mode' : 'Edit'}</span>
                    </button>
                  </Tooltip>
                )}
              </div>
            )}
          </div>

          {/* Active NONYE AI Processing State (Real Application State Only — Never Fake Output) */}
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div
                key="nonye-ai-processing"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
                className="p-6 space-y-6"
                aria-live="polite"
                aria-busy="true"
              >
                <div className="p-5 rounded-xl bg-[#F6F9FC] border border-[#0E9F9A]/30 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0E9F9A] animate-pulse" />
                      <span className="font-display text-sm font-bold text-[#0B1F33]">
                        NONYE AI
                      </span>
                      <span className="text-xs font-medium text-[#0E9F9A]">
                        Organizing clinical information...
                      </span>
                    </div>
                    <Loader2 className="w-4 h-4 text-[#0E9F9A] animate-spin shrink-0" />
                  </div>

                  <div className="cb-ai-progress-bar h-1.5 w-full rounded-full" />

                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Structuring clinician-supplied encounter notes into Encounter Summary, Presenting Concern, Relevant History, Medications, Allergies, Investigations, Clinical Notes, Follow-Up Items, and Missing Information.
                  </p>
                </div>

                {/* Structural Section Placeholders (No Fake Clinical Output) */}
                <div className="space-y-3">
                  {[
                    'Encounter Summary',
                    'Presenting Concern',
                    'Relevant History',
                    'Medications & Allergies',
                    'Investigations & Clinical Notes',
                    'Follow-Up Items & Missing Information',
                  ].map((label, idx) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.25,
                        delay: idx * 0.05,
                        ease: EASE_OUT_EXPO,
                      }}
                      className="p-3.5 rounded-lg border border-[#E2E8F0] bg-white space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#64748B]">
                          {label}
                        </span>
                        <span className="text-[11px] text-[#0E9F9A] font-mono">
                          Structuring...
                        </span>
                      </div>
                      <div className="cb-skeleton h-3.5 w-5/6 rounded" />
                      <div className="cb-skeleton h-3.5 w-2/3 rounded" />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : !docDraft ? (
              <motion.div
                key="nonye-ai-empty"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
                className="p-10 text-center space-y-3"
              >
                <Sparkles className="w-8 h-8 text-[#0E9F9A] mx-auto" />
                <h3 className="font-display text-base font-bold text-[#0B1F33]">
                  No AI Documentation Generated Yet
                </h3>
                <p className="text-xs text-[#64748B] max-w-md mx-auto">
                  Click below to send the clinician&apos;s original encounter input to NONYE AI for structured organization.
                </p>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  className="cb-btn cb-btn-teal mt-2 py-2.5 px-5 text-xs font-semibold rounded-lg gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate AI Documentation</span>
                </button>
              </motion.div>
            ) : (
              /* Progressive Staggered Reveal of Real Structured AI Documentation */
              <motion.div
                key={`nonye-ai-doc-${currentEncounter.id}-${revealGenerationCount}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="p-6 space-y-5"
              >
                {/* Sub-notice inside Right Panel */}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
                  className="p-3 rounded-lg bg-[#F6F9FC] border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <span className="font-medium text-[#0B1F33]">
                    AI-generated documentation. Review carefully before saving.
                  </span>
                  {currentEncounter.reviewedBy ? (
                    <span className="text-[#64748B] font-mono tabular-nums">
                      Reviewed by {currentEncounter.reviewedBy}
                    </span>
                  ) : (
                    <span className="text-[#D97706] font-medium">
                      Awaiting Clinician Verification
                    </span>
                  )}
                </motion.div>

                {/* Section 1: Encounter Summary */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: 0.04, ease: EASE_OUT_EXPO }}
                  className="space-y-1.5"
                >
                  <label className="block text-xs font-bold text-[#0B1F33]">
                    Encounter Summary
                  </label>
                  {isEditingDoc && !isFinalized ? (
                    <textarea
                      rows={3}
                      value={docDraft.encounterSummary}
                      onChange={(e) =>
                        setDocDraft({ ...docDraft, encounterSummary: e.target.value })
                      }
                      className="cb-input w-full px-3.5 py-2 text-xs leading-relaxed rounded-lg"
                    />
                  ) : (
                    <div className="p-3.5 rounded-lg bg-[#F6F9FC] border border-[#E2E8F0] text-xs text-[#17212B] leading-relaxed">
                      {docDraft.encounterSummary || 'Not provided.'}
                    </div>
                  )}
                </motion.div>

                {/* Section 2: Presenting Concern */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: 0.09, ease: EASE_OUT_EXPO }}
                  className="space-y-1.5"
                >
                  <label className="block text-xs font-bold text-[#0B1F33]">
                    Presenting Concern
                  </label>
                  {isEditingDoc && !isFinalized ? (
                    <input
                      type="text"
                      value={docDraft.presentingConcern}
                      onChange={(e) =>
                        setDocDraft({ ...docDraft, presentingConcern: e.target.value })
                      }
                      className="cb-input w-full px-3.5 py-2 text-xs rounded-lg"
                    />
                  ) : (
                    <div className="p-3 rounded-lg bg-[#F6F9FC] border border-[#E2E8F0] text-xs text-[#17212B]">
                      {docDraft.presentingConcern || 'Not provided.'}
                    </div>
                  )}
                </motion.div>

                {/* Sections 3–9: Progressive Staggered Reveal for Array Sections */}
                {ARRAY_SECTIONS.map((section, sectionIdx) => {
                  const items = docDraft[section.key];
                  const isMissingSection = section.key === 'missingInformation';
                  return (
                    <motion.div
                      key={section.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.34,
                        delay: 0.14 + sectionIdx * 0.055,
                        ease: EASE_OUT_EXPO,
                      }}
                      className={`space-y-2 pt-3 border-t border-[#E2E8F0] ${
                        isMissingSection
                          ? 'bg-[#D97706]/5 p-3.5 rounded-lg border border-[#D97706]/30'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold text-[#0B1F33]">
                            {section.label}
                          </h3>
                          <p className="text-[11px] text-[#64748B]">{section.helper}</p>
                        </div>
                        {isEditingDoc && !isFinalized && (
                          <button
                            type="button"
                            onClick={() => addArrayItem(section.key)}
                            className="cb-btn py-1 px-2.5 text-[11px] font-medium text-[#1769E0] bg-white hover:bg-[#1769E0]/10 border border-[#E2E8F0] rounded-md gap-1 whitespace-nowrap"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Item</span>
                          </button>
                        )}
                      </div>

                      {isEditingDoc && !isFinalized ? (
                        <div className="space-y-2">
                          {items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={item}
                                onChange={(e) =>
                                  updateArrayItem(section.key, idx, e.target.value)
                                }
                                placeholder={`Enter ${section.label.toLowerCase()} item...`}
                                className="cb-input flex-1 px-3 py-1.5 text-xs rounded-lg"
                              />
                              <Tooltip content="Remove item" side="left">
                                <button
                                  type="button"
                                  onClick={() => removeArrayItem(section.key, idx)}
                                  className="cb-icon-btn p-1.5 text-[#64748B] hover:text-[#DC2626] hover:bg-[#DC2626]/10 rounded-md"
                                  aria-label="Remove item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </Tooltip>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <ul className="space-y-1.5 pl-4 list-disc text-xs text-[#17212B]">
                          {items.map((item, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </motion.div>
                  );
                })}

                {/* Human Review & Finalization Footer */}
                {!isFinalized ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.5, ease: EASE_OUT_EXPO }}
                    className="pt-5 border-t border-[#E2E8F0] space-y-4"
                  >
                    <label
                      className={`flex items-start gap-2.5 p-3.5 rounded-lg border transition-colors duration-150 cursor-pointer ${
                        confirmClinicianReview
                          ? 'bg-[#16A34A]/5 border-[#16A34A]/40'
                          : 'bg-[#F6F9FC] border-[#E2E8F0] hover:border-[#CBD5E1]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={confirmClinicianReview}
                        onChange={(e) => setConfirmClinicianReview(e.target.checked)}
                        className="mt-0.5 rounded border-[#E2E8F0] text-[#1769E0] focus:ring-[#1769E0] cursor-pointer"
                      />
                      <span className="text-xs text-[#17212B] leading-relaxed">
                        <strong>Clinician Review Attestation:</strong> I confirm that I am an authorized healthcare professional ({currentUser.name}) and have reviewed and verified this AI-organized documentation against the patient encounter before finalization.
                      </span>
                    </label>

                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => handleSaveReviewed(false)}
                        disabled={isSaving || isGenerating}
                        className="cb-btn cb-btn-secondary py-2.5 px-4 text-xs font-semibold rounded-lg gap-2 whitespace-nowrap"
                      >
                        {savingAction === 'review' ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#1769E0]" />
                        ) : (
                          <Save className="w-4 h-4 text-[#1769E0]" />
                        )}
                        <span>
                          {savingAction === 'review'
                            ? 'Saving Reviewed Record...'
                            : 'Save Reviewed Documentation'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveReviewed(true)}
                        disabled={isSaving || isGenerating}
                        className="cb-btn cb-btn-primary cb-btn-shine py-2.5 px-5 text-xs font-semibold rounded-lg gap-2 whitespace-nowrap"
                      >
                        {savingAction === 'finalize' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        <span>
                          {savingAction === 'finalize'
                            ? 'Finalizing Record...'
                            : 'Finalize Clinical Record'}
                        </span>
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
                    className="pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#16A34A] bg-[#16A34A]/5 p-4 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>
                        This clinical record has been reviewed and finalized by{' '}
                        <strong>{currentEncounter.reviewedBy || currentUser.name}</strong>. Finalized clinical records are protected against silent overwriting.
                      </span>
                    </div>
                    {patient && (
                      <button
                        type="button"
                        onClick={() => onOpenPatient(patient.id)}
                        className="cb-link text-xs font-semibold text-[#1769E0] whitespace-nowrap gap-1 shrink-0"
                      >
                        <span>Open Patient Timeline</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
