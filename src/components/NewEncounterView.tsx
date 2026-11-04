import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileCheck,
  Loader2,
  Save,
  ShieldAlert,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import {
  OriginalEncounterInput,
  Patient,
  UserProfile,
  VitalSigns,
} from '../types';
import {
  calculateAge,
  getTodayDateString,
  NIGERIA_CLINICAL_DEPARTMENTS,
} from '../data/seedData';
import { Tooltip } from './Tooltip';

interface NewEncounterViewProps {
  currentUser: UserProfile;
  patients: Patient[];
  departments?: string[];
  preselectedPatientId?: string | null;
  preselectedDepartment?: string | null;
  onCancel: () => void;
  onNewPatientRequest: () => void;
  onSaveDraft: (
    patientId: string,
    encounterDate: string,
    encounterType: string,
    originalInput: OriginalEncounterInput,
    department?: string,
    vitalSigns?: VitalSigns | null
  ) => Promise<string>;
  onCreateAndGenerateAi: (
    patientId: string,
    encounterDate: string,
    encounterType: string,
    originalInput: OriginalEncounterInput,
    department?: string,
    vitalSigns?: VitalSigns | null
  ) => Promise<void>;
}

const ENCOUNTER_TYPES = [
  'Outpatient Consultation',
  'Follow-Up Visit',
  'Acute Care / Triage',
  'Chronic Disease Review',
  'Antenatal Visit',
  'Laboratory Review',
];

export const NewEncounterView: React.FC<NewEncounterViewProps> = ({
  currentUser,
  patients,
  departments,
  preselectedPatientId,
  preselectedDepartment,
  onCancel,
  onNewPatientRequest,
  onSaveDraft,
  onCreateAndGenerateAi,
}) => {
  const canCreateEncounter =
    currentUser.role === 'Clinician' || currentUser.role === 'Admin';

  const departmentOptions =
    departments && departments.length > 0
      ? departments
      : NIGERIA_CLINICAL_DEPARTMENTS;

  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    preselectedPatientId || (patients[0]?.id ?? '')
  );
  const [encounterDate, setEncounterDate] = useState<string>(getTodayDateString());
  const [encounterType, setEncounterType] = useState<string>(ENCOUNTER_TYPES[0]);
  const [department, setDepartment] = useState<string>(
    preselectedDepartment ||
      (currentUser.department && departmentOptions.includes(currentUser.department)
        ? currentUser.department
        : departmentOptions[0] || 'General Outpatient (GOPD)')
  );

  // Structured Vital Signs & Triage Flowsheet State
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [pulseRate, setPulseRate] = useState('');
  const [temperatureCelsius, setTemperatureCelsius] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [spO2, setSpO2] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [bloodGlucose, setBloodGlucose] = useState('');

  const [reasonForVisit, setReasonForVisit] = useState('');
  const [patientReportedInfo, setPatientReportedInfo] = useState('');
  const [relevantHistory, setRelevantHistory] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');
  const [allergies, setAllergies] = useState('');
  const [investigations, setInvestigations] = useState('');
  const [clinicianObservations, setClinicianObservations] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  if (!canCreateEncounter) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 text-center max-w-lg mx-auto my-8">
        <ShieldAlert className="w-10 h-10 text-[#DC2626] mx-auto mb-3" />
        <h2 className="font-display text-lg font-bold text-[#0B1F33]">
          You do not have permission to access this record.
        </h2>
        <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
          Only users with <strong>Clinician</strong> or <strong>Admin</strong> authorization can record clinical encounters and generate AI clinical documentation.
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="cb-btn cb-btn-primary mt-5 py-2 px-4 text-xs font-medium rounded-lg"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const buildVitalSignsPayload = (): VitalSigns | null => {
    const raw: VitalSigns = {
      bloodPressureSystolic: bpSystolic.trim(),
      bloodPressureDiastolic: bpDiastolic.trim(),
      pulseRate: pulseRate.trim(),
      temperatureCelsius: temperatureCelsius.trim(),
      respiratoryRate: respiratoryRate.trim(),
      spO2: spO2.trim(),
      weightKg: weightKg.trim(),
      bloodGlucose: bloodGlucose.trim(),
    };
    const hasAnyVital = Object.values(raw).some((v) => Boolean(v && v.length > 0));
    return hasAnyVital ? raw : null;
  };

  const buildInputPayload = (): OriginalEncounterInput => ({
    reasonForVisit: reasonForVisit.trim(),
    patientReportedInfo: patientReportedInfo.trim(),
    relevantHistory: relevantHistory.trim(),
    currentMedications: currentMedications.trim(),
    allergies: allergies.trim(),
    investigations: investigations.trim(),
    clinicianObservations: clinicianObservations.trim(),
    additionalNotes: additionalNotes.trim(),
  });

  const hasAnyClinicalInput =
    Object.values(buildInputPayload()).some((v) => v.length > 0) ||
    buildVitalSignsPayload() !== null;

  const validateBeforeSave = (): boolean => {
    setAttemptedSubmit(true);
    if (!selectedPatientId) {
      setError('Please select a patient before saving the encounter.');
      return false;
    }
    if (!encounterDate) {
      setError('Please specify the encounter date.');
      return false;
    }
    if (!hasAnyClinicalInput) {
      setError(
        'Please enter at least a Reason for Visit, Vital Signs, or Clinician Observations before proceeding.'
      );
      return false;
    }
    return true;
  };

  const handleLoadSampleNote = () => {
    setError(null);
    setAttemptedSubmit(false);
    setEncounterType('Outpatient Consultation');
    setBpSystolic('122');
    setBpDiastolic('78');
    setPulseRate('78');
    setTemperatureCelsius('36.6');
    setRespiratoryRate('16');
    setSpO2('99');
    setWeightKg('68.5');
    setBloodGlucose('94 mg/dL (RBG)');
    setReasonForVisit('Epigastric discomfort and postprandial bloating for 5 days');
    setPatientReportedInfo(
      'Patient reports burning upper abdominal discomfort worse 1 hour after spicy meals, relieved temporarily by water. Denies hematemesis, melena, unintentional weight loss, or dysphagia.'
    );
    setRelevantHistory(
      'Occasional NSAID (Ibuprofen) use for knee pain over the past 2 weeks. No prior peptic ulcer history documented.'
    );
    setCurrentMedications('Ibuprofen 400mg taken intermittently (discontinued 2 days ago by patient)');
    setAllergies('Penicillin — reported urticarial rash in 2019');
    setInvestigations(
      'BP: 122/78 mmHg. Pulse: 78 bpm. Temp: 36.6°C. H. pylori stool antigen test requested; PCV: 39%.'
    );
    setClinicianObservations(
      'Alert and comfortable. Mild epigastric tenderness on deep palpation; no guarding, no rebound tenderness, normal bowel sounds. Advised to avoid non-prescribed NSAIDs and late-night heavy meals. Follow up in 1 week with H. pylori stool antigen result.'
    );
    setAdditionalNotes('Patient counselled on red-flag gastrointestinal symptoms requiring urgent return.');
  };

  const handleSaveDraftClick = async () => {
    setError(null);
    if (!validateBeforeSave()) return;
    setIsSavingDraft(true);
    try {
      await onSaveDraft(
        selectedPatientId,
        encounterDate,
        encounterType,
        buildInputPayload(),
        department,
        buildVitalSignsPayload()
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to save draft encounter. Please try again.'
      );
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleGenerateAiClick = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateBeforeSave()) return;
    setIsGeneratingAi(true);
    try {
      await onCreateAndGenerateAi(
        selectedPatientId,
        encounterDate,
        encounterType,
        buildInputPayload(),
        department,
        buildVitalSignsPayload()
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to generate documentation. Please try again.'
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  // Physiological range flags for clinical awareness
  const sysNum = parseFloat(bpSystolic);
  const diaNum = parseFloat(bpDiastolic);
  const isBpElevated =
    (!Number.isNaN(sysNum) && sysNum >= 140) || (!Number.isNaN(diaNum) && diaNum >= 90);
  const pulseNum = parseFloat(pulseRate);
  const isPulseAbnormal =
    !Number.isNaN(pulseNum) && (pulseNum > 100 || pulseNum < 50);
  const tempNum = parseFloat(temperatureCelsius);
  const isTempFebrile = !Number.isNaN(tempNum) && tempNum >= 37.8;
  const spo2Num = parseFloat(spO2);
  const isSpo2Low = !Number.isNaN(spo2Num) && spo2Num < 95;

  const getClinicalInputClass = (val: string, highlightIfEmptyOnAttempt: boolean = false) => {
    if (highlightIfEmptyOnAttempt && attemptedSubmit && !hasAnyClinicalInput) {
      return 'cb-input cb-input-error';
    }
    if (val.trim().length > 0) {
      return 'cb-input cb-input-valid';
    }
    return 'cb-input';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="cb-link text-xs font-medium text-[#64748B] hover:text-[#0B1F33] gap-1.5 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span>Back</span>
        </button>

        <Tooltip content="Fill form with a realistic synthetic Nigerian clinic consultation note" side="left">
          <button
            type="button"
            onClick={handleLoadSampleNote}
            className="cb-btn py-1.5 px-3 text-xs font-medium text-[#0E9F9A] bg-[#0E9F9A]/10 hover:bg-[#0E9F9A]/18 border border-[#0E9F9A]/25 rounded-lg gap-1.5 whitespace-nowrap"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Populate Synthetic Clinical Note</span>
          </button>
        </Tooltip>
      </div>

      {/* Form Card */}
      <form
        onSubmit={handleGenerateAiClick}
        noValidate
        className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs"
      >
        <div className="px-6 py-5 border-b border-[#E2E8F0] bg-[#F6F9FC] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-lg sm:text-xl font-bold text-[#0B1F33]">
              New Clinical Encounter
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Enter clinical notes naturally. You do not need to complete every field — NONYE AI will structure provided facts and flag missing items.
            </p>
          </div>
          <div className="text-xs text-[#64748B] font-mono tabular-nums shrink-0">
            Clinician: <strong className="text-[#0B1F33]">{currentUser.name}</strong>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className="p-3.5 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/30 flex items-start gap-2.5 text-xs text-[#DC2626]"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Patient & Encounter Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-6 border-b border-[#E2E8F0]">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#17212B]">
                  Patient <span className="text-[#DC2626]">*</span>
                </label>
                <button
                  type="button"
                  onClick={onNewPatientRequest}
                  className="cb-link text-[11px] font-medium gap-1"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>+ Register New</span>
                </button>
              </div>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="cb-input w-full px-3 py-2 text-sm rounded-lg"
                required
              >
                <option value="" disabled>
                  Select patient...
                </option>
                {patients.map((pat) => (
                  <option key={pat.id} value={pat.id}>
                    {pat.firstName} {pat.lastName} ({pat.patientId})
                  </option>
                ))}
              </select>
              {selectedPatient && (
                <p className="text-[11px] text-[#64748B] mt-1 font-mono tabular-nums">
                  {calculateAge(selectedPatient.dateOfBirth)} yrs · {selectedPatient.sex} · DOB {selectedPatient.dateOfBirth}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17212B] mb-1">
                Clinical Department <span className="text-[#DC2626]">*</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="cb-input w-full px-3 py-2 text-sm rounded-lg"
              >
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17212B] mb-1">
                Encounter Date <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="date"
                value={encounterDate}
                onChange={(e) => setEncounterDate(e.target.value)}
                className="cb-input w-full px-3 py-2 text-sm font-mono rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17212B] mb-1">
                Encounter Type <span className="text-[#DC2626]">*</span>
              </label>
              <select
                value={encounterType}
                onChange={(e) => setEncounterType(e.target.value)}
                className="cb-input w-full px-3 py-2 text-sm rounded-lg"
              >
                {ENCOUNTER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Structured Vital Signs & Triage Flowsheet */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#F6F9FC] border border-[#E2E8F0] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0E9F9A]" />
                <div>
                  <h2 className="font-display text-sm font-bold text-[#0B1F33]">
                    Structured Vital Signs &amp; Triage Flowsheet
                  </h2>
                  <p className="text-[11px] text-[#64748B]">
                    Recorded parameters automatically populate the patient&apos;s longitudinal vital signs flowsheet and NONYE AI documentation.
                  </p>
                </div>
              </div>
              <span className="text-[11px] text-[#64748B] font-mono">
                Optional · Physiological threshold alerts active
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              {/* Blood Pressure (Systolic / Diastolic) */}
              <div className="col-span-2 sm:col-span-1 lg:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-[#17212B]">
                    Blood Pressure (mmHg)
                  </label>
                  {isBpElevated && (
                    <span className="text-[10px] font-semibold text-[#DC2626]">
                      Elevated BP
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={bpSystolic}
                    onChange={(e) => setBpSystolic(e.target.value)}
                    placeholder="Sys (120)"
                    aria-label="Systolic Blood Pressure"
                    className={`cb-input w-full px-2.5 py-1.5 text-xs font-mono tabular-nums rounded-lg ${
                      isBpElevated ? 'border-[#DC2626] bg-[#DC2626]/5' : ''
                    }`}
                  />
                  <span className="text-xs font-mono text-[#64748B]">/</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={bpDiastolic}
                    onChange={(e) => setBpDiastolic(e.target.value)}
                    placeholder="Dia (80)"
                    aria-label="Diastolic Blood Pressure"
                    className={`cb-input w-full px-2.5 py-1.5 text-xs font-mono tabular-nums rounded-lg ${
                      isBpElevated ? 'border-[#DC2626] bg-[#DC2626]/5' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Pulse Rate */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-[#17212B]">
                    Pulse (bpm)
                  </label>
                  {isPulseAbnormal && (
                    <span className="text-[10px] font-semibold text-[#D97706]">
                      Check
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={pulseRate}
                  onChange={(e) => setPulseRate(e.target.value)}
                  placeholder="e.g. 76"
                  className={`cb-input w-full px-2.5 py-1.5 text-xs font-mono tabular-nums rounded-lg ${
                    isPulseAbnormal ? 'border-[#D97706] bg-[#D97706]/5' : ''
                  }`}
                />
              </div>

              {/* Temperature */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-[#17212B]">
                    Temp (°C)
                  </label>
                  {isTempFebrile && (
                    <span className="text-[10px] font-semibold text-[#DC2626]">
                      Febrile
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={temperatureCelsius}
                  onChange={(e) => setTemperatureCelsius(e.target.value)}
                  placeholder="e.g. 36.7"
                  className={`cb-input w-full px-2.5 py-1.5 text-xs font-mono tabular-nums rounded-lg ${
                    isTempFebrile ? 'border-[#DC2626] bg-[#DC2626]/5' : ''
                  }`}
                />
              </div>

              {/* Respiratory Rate */}
              <div>
                <label className="block text-[11px] font-semibold text-[#17212B] mb-1">
                  Resp. Rate (/min)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={respiratoryRate}
                  onChange={(e) => setRespiratoryRate(e.target.value)}
                  placeholder="e.g. 16"
                  className="cb-input w-full px-2.5 py-1.5 text-xs font-mono tabular-nums rounded-lg"
                />
              </div>

              {/* SpO2 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-[#17212B]">
                    SpO₂ (%)
                  </label>
                  {isSpo2Low && (
                    <span className="text-[10px] font-semibold text-[#DC2626]">
                      Low SpO₂
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={spO2}
                  onChange={(e) => setSpO2(e.target.value)}
                  placeholder="e.g. 99"
                  className={`cb-input w-full px-2.5 py-1.5 text-xs font-mono tabular-nums rounded-lg ${
                    isSpo2Low ? 'border-[#DC2626] bg-[#DC2626]/5' : ''
                  }`}
                />
              </div>

              {/* Weight & Point-of-Care Glucose */}
              <div className="col-span-2 sm:col-span-3 lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#17212B] mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="e.g. 72.5"
                    className="cb-input w-full px-2.5 py-1.5 text-xs font-mono tabular-nums rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Optional Point-of-Care Blood Glucose Row */}
            <div className="pt-1 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="sm:w-64">
                <label className="block text-[11px] font-semibold text-[#17212B] mb-1">
                  Point-of-Care Blood Glucose (FBG / RBG)
                </label>
                <input
                  type="text"
                  value={bloodGlucose}
                  onChange={(e) => setBloodGlucose(e.target.value)}
                  placeholder="e.g. 96 mg/dL (FBG)"
                  className="cb-input w-full px-2.5 py-1.5 text-xs font-mono rounded-lg"
                />
              </div>
              <p className="text-[11px] text-[#64748B] sm:pt-4">
                Values entered here are preserved as structured clinical parameters and cross-checked with NONYE AI missing-information flags.
              </p>
            </div>
          </div>

          {/* Unstructured Clinical Input Fields */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#17212B]">
                  Reason for Visit (Presenting Complaint)
                </label>
                {reasonForVisit.trim().length > 0 && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                )}
              </div>
              <input
                type="text"
                value={reasonForVisit}
                onChange={(e) => setReasonForVisit(e.target.value)}
                placeholder="e.g. Routine blood pressure review and intermittent frontal headache for 3 days"
                className={`w-full px-3.5 py-2 text-sm rounded-lg ${getClinicalInputClass(
                  reasonForVisit,
                  true
                )}`}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#17212B]">
                    Patient-Reported Information
                  </label>
                  {patientReportedInfo.trim().length > 0 && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                  )}
                </div>
                <textarea
                  rows={4}
                  value={patientReportedInfo}
                  onChange={(e) => setPatientReportedInfo(e.target.value)}
                  placeholder="Patient's narrative of symptoms, onset, duration, and associated factors..."
                  className={`w-full px-3.5 py-2 text-sm rounded-lg ${getClinicalInputClass(
                    patientReportedInfo
                  )}`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#17212B]">
                    Relevant History
                  </label>
                  {relevantHistory.trim().length > 0 && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                  )}
                </div>
                <textarea
                  rows={4}
                  value={relevantHistory}
                  onChange={(e) => setRelevantHistory(e.target.value)}
                  placeholder="Past medical, surgical, family, or social history mentioned..."
                  className={`w-full px-3.5 py-2 text-sm rounded-lg ${getClinicalInputClass(
                    relevantHistory
                  )}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#17212B]">
                    Current Medications
                  </label>
                  {currentMedications.trim().length > 0 && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                  )}
                </div>
                <textarea
                  rows={3}
                  value={currentMedications}
                  onChange={(e) => setCurrentMedications(e.target.value)}
                  placeholder="Medications explicitly reported or currently taken by the patient..."
                  className={`w-full px-3.5 py-2 text-sm rounded-lg ${getClinicalInputClass(
                    currentMedications
                  )}`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#17212B]">
                    Allergies
                  </label>
                  {allergies.trim().length > 0 && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                  )}
                </div>
                <textarea
                  rows={3}
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="Drug, food, or environmental allergies (or leave blank if unrecorded)..."
                  className={`w-full px-3.5 py-2 text-sm rounded-lg ${getClinicalInputClass(
                    allergies
                  )}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#17212B]">
                    Investigations / Lab Information
                  </label>
                  {investigations.trim().length > 0 && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                  )}
                </div>
                <textarea
                  rows={4}
                  value={investigations}
                  onChange={(e) => setInvestigations(e.target.value)}
                  placeholder="Vital signs, point-of-care tests (mRDT, PCV, FBG, urinalysis), or lab results..."
                  className={`w-full px-3.5 py-2 text-sm rounded-lg ${getClinicalInputClass(
                    investigations
                  )}`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#17212B]">
                    Clinician Observations &amp; Plan Notes
                  </label>
                  {clinicianObservations.trim().length > 0 && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                  )}
                </div>
                <textarea
                  rows={4}
                  value={clinicianObservations}
                  onChange={(e) => setClinicianObservations(e.target.value)}
                  placeholder="Physical examination findings, clinician observations, and stated follow-up instructions..."
                  className={`w-full px-3.5 py-2 text-sm rounded-lg ${getClinicalInputClass(
                    clinicianObservations,
                    true
                  )}`}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#17212B]">
                  Additional Notes
                </label>
                {additionalNotes.trim().length > 0 && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                )}
              </div>
              <textarea
                rows={2}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Any additional context or administrative encounter notes..."
                className={`w-full px-3.5 py-2 text-sm rounded-lg ${getClinicalInputClass(
                  additionalNotes
                )}`}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#F6F9FC] border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-[#64748B]">
            Your original clinician-entered text is permanently preserved alongside any AI-structured documentation.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSavingDraft || isGeneratingAi}
              className="cb-btn cb-btn-secondary py-2 px-4 text-xs font-medium rounded-lg whitespace-nowrap"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveDraftClick}
              disabled={isSavingDraft || isGeneratingAi}
              className="cb-btn cb-btn-secondary py-2 px-4 text-xs font-medium rounded-lg gap-1.5 whitespace-nowrap"
            >
              {isSavingDraft ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 text-[#1769E0]" />
              )}
              <span>{isSavingDraft ? 'Saving Draft...' : 'Save as Draft'}</span>
            </button>

            <button
              type="submit"
              disabled={isSavingDraft || isGeneratingAi}
              className="cb-btn cb-btn-teal py-2.5 px-5 text-xs font-semibold rounded-lg gap-2 whitespace-nowrap group"
            >
              {isGeneratingAi ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>NONYE AI Organizing Documentation...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 transition-transform duration-200 group-hover:rotate-12" />
                  <span>Generate AI Documentation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
