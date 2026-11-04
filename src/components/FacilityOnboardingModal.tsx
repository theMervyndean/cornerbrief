import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  Stethoscope,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Facility, FacilityType, UserRole } from '../types';
import { NIGERIA_CLINICAL_DEPARTMENTS, NIGERIAN_STATES } from '../data/seedData';
import { CornerBriefLogo } from './CornerBriefLogo';

export interface OnboardingStaffMemberInput {
  name: string;
  email: string;
  role: UserRole;
  department: string;
}

export interface FacilityOnboardingPayload {
  name: string;
  facilityType: FacilityType;
  facilityCode: string;
  address: string;
  city: string;
  state: string;
  contactEmail: string;
  contactPhone: string;
  adminName: string;
  adminEmail: string;
  adminRoleTitle: string;
  departments: string[];
  initialStaff: OnboardingStaffMemberInput[];
  includeStarterPatients: boolean;
}

interface FacilityOnboardingModalProps {
  isOpen: boolean;
  initialFacilityType?: FacilityType;
  onClose: () => void;
  onCompleteOnboarding: (
    payload: FacilityOnboardingPayload,
    registeredFacility?: Facility
  ) => Promise<void>;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const FACILITY_TYPES: {
  type: FacilityType;
  title: string;
  description: string;
  recommendedDepts: string[];
}[] = [
  {
    type: 'Hospital',
    title: 'Multi-Department Hospital',
    description:
      'Tertiary, general, or private multi-specialty hospital with inpatient and outpatient departments.',
    recommendedDepts: [
      'General Outpatient (GOPD)',
      'Internal Medicine',
      'Emergency & Acute Care',
      'Maternal & Antenatal Care',
      'Paediatrics & Child Health',
    ],
  },
  {
    type: 'Specialist Clinic',
    title: 'Specialist Outpatient Clinic',
    description:
      'Cardiology, maternal care, endocrinology, or surgical specialist practice.',
    recommendedDepts: [
      'Cardiology & Hypertension',
      'Endocrinology & Diabetes',
      'Maternal & Antenatal Care',
      'General Outpatient (GOPD)',
    ],
  },
  {
    type: 'Medical Center',
    title: 'Comprehensive Medical Center',
    description:
      'Group medical practice with family medicine, diagnostics, and acute care services.',
    recommendedDepts: [
      'Family Medicine',
      'General Outpatient (GOPD)',
      'Laboratory & Diagnostics',
      'Maternal & Antenatal Care',
    ],
  },
  {
    type: 'Primary Care Clinic',
    title: 'Primary Care & Community Clinic',
    description:
      'Outpatient primary healthcare clinic focused on acute consultations and chronic follow-ups.',
    recommendedDepts: [
      'General Outpatient (GOPD)',
      'Family Medicine',
      'Maternal & Antenatal Care',
    ],
  },
];

export const FacilityOnboardingModal: React.FC<FacilityOnboardingModalProps> = ({
  isOpen,
  initialFacilityType = 'Hospital',
  onClose,
  onCompleteOnboarding,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Facility Identity
  const [facilityName, setFacilityName] = useState('');
  const [facilityType, setFacilityType] = useState<FacilityType>(initialFacilityType);
  const [facilityCode, setFacilityCode] = useState('');

  // Step 2: Location & Primary Administrator
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Lagos');
  const [state, setState] = useState('Lagos State');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('+234 ');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminRoleTitle, setAdminRoleTitle] = useState('Chief Medical Director / Facility Admin');

  // Step 3: Clinical Departments & Initial Staff
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([
    'General Outpatient (GOPD)',
    'Internal Medicine',
    'Maternal & Antenatal Care',
  ]);
  const [customDepartment, setCustomDepartment] = useState('');
  const [initialStaff, setInitialStaff] = useState<OnboardingStaffMemberInput[]>([
    {
      name: 'Dr. Kemi Adebisi',
      email: 'kemi.adebisi@facility.ng',
      role: 'Clinician',
      department: 'General Outpatient (GOPD)',
    },
    {
      name: 'Sadiq Lawal',
      email: 'sadiq.lawal@facility.ng',
      role: 'Staff',
      department: 'General Outpatient (GOPD)',
    },
  ]);

  // Step 4: Workspace Initialization Preferences
  const [includeStarterPatients, setIncludeStarterPatients] = useState(true);

  // Registration Result Confirmation State (Stage 2A)
  const [registrationSuccessResult, setRegistrationSuccessResult] = useState<{
    facility: Facility;
    message: string;
    persistedToFirestore?: boolean;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError(null);
      setRegistrationSuccessResult(null);
      setFacilityType(initialFacilityType);
      const found = FACILITY_TYPES.find((f) => f.type === initialFacilityType);
      if (found) {
        setSelectedDepartments(found.recommendedDepts);
      }
    }
  }, [isOpen, initialFacilityType]);

  // Auto-generate facility short code when facility name changes
  useEffect(() => {
    if (!facilityName.trim()) {
      setFacilityCode('');
      return;
    }
    const words = facilityName
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const initials = words
      .slice(0, 4)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('');
    const prefix = initials.length >= 2 ? initials : facilityName.slice(0, 3).toUpperCase();
    const stateCode = state.slice(0, 3).toUpperCase();
    setFacilityCode(`${prefix}-${stateCode}`);
  }, [facilityName, state]);

  if (!isOpen) return null;

  const handleSelectFacilityType = (type: FacilityType) => {
    setFacilityType(type);
    const preset = FACILITY_TYPES.find((item) => item.type === type);
    if (preset) {
      setSelectedDepartments(preset.recommendedDepts);
    }
  };

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const handleAddCustomDepartment = () => {
    const cleaned = customDepartment.trim();
    if (!cleaned) return;
    if (!selectedDepartments.includes(cleaned)) {
      setSelectedDepartments((prev) => [...prev, cleaned]);
    }
    setCustomDepartment('');
  };

  const handleAddStaffRow = () => {
    setInitialStaff((prev) => [
      ...prev,
      {
        name: '',
        email: '',
        role: 'Clinician',
        department: selectedDepartments[0] || 'General Outpatient (GOPD)',
      },
    ]);
  };

  const handleRemoveStaffRow = (index: number) => {
    setInitialStaff((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateStaffRow = (
    index: number,
    field: keyof OnboardingStaffMemberInput,
    value: string
  ) => {
    setInitialStaff((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const validateCurrentStep = (): boolean => {
    setError(null);
    if (step === 1) {
      if (facilityName.trim().length < 3) {
        setError('Please enter your official healthcare facility name (at least 3 characters).');
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (address.trim().length < 3 || city.trim().length < 2) {
        setError('Please enter the street address and city for your healthcare facility.');
        return false;
      }
      if (adminName.trim().length < 2 || !adminEmail.includes('@')) {
        setError('Please provide the primary Facility Administrator name and valid email.');
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (selectedDepartments.length === 0) {
        setError('Please select at least one clinical department or unit for your workspace.');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNextStep = () => {
    if (!validateCurrentStep()) return;
    if (step < 4) {
      setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
    }
  };

  const handlePreviousStep = () => {
    setError(null);
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const cleanedStaff = initialStaff.filter(
        (s) => s.name.trim().length > 0 && s.email.trim().length > 0
      );

      const normalizedCode = (facilityCode.trim() || 'CB-FAC').toUpperCase();
      const payload: FacilityOnboardingPayload = {
        name: facilityName.trim(),
        facilityType,
        facilityCode: normalizedCode,
        address: address.trim(),
        city: city.trim(),
        state,
        contactEmail: (contactEmail.trim() || adminEmail.trim()).toLowerCase(),
        contactPhone: contactPhone.trim() || '+234 800 000 0000',
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim().toLowerCase(),
        adminRoleTitle: adminRoleTitle.trim(),
        departments: selectedDepartments,
        initialStaff: cleanedStaff,
        includeStarterPatients,
      };

      // Connect existing wizard to secure backend registration endpoint
      const response = await fetch('/api/facilities/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get('content-type') || '';
      let responseData: any = null;

      if (contentType.includes('application/json')) {
        responseData = await response.json().catch(() => null);
      } else {
        const rawText = await response.text();
        console.warn('Non-JSON response from registration endpoint:', rawText.slice(0, 120));
        if (!response.ok) {
          throw new Error(
            `Facility registration service error (HTTP ${response.status}). Please try again in a few moments.`
          );
        } else {
          throw new Error(
            'The application server is currently initializing. Please click "Submit Facility for Registration" again.'
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          responseData?.error ||
            responseData?.message ||
            `Facility registration failed (HTTP ${response.status}). Please check your inputs and try again.`
        );
      }

      if (!responseData || !responseData.facility) {
        throw new Error('Registration received an unexpected server response. Please try submitting again.');
      }

      setRegistrationSuccessResult(responseData);

      // Notify parent without granting workspace access to Pending facility
      try {
        await onCompleteOnboarding(payload, responseData.facility);
      } catch (onboardingErr) {
        console.warn('Workspace sync notification warning:', onboardingErr);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to submit facility registration. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillQuickHospitalPreset = () => {
    setFacilityName('Ibadan Premier Specialist Hospital');
    setFacilityType('Hospital');
    setAddress('18 Ring Road, Bodija');
    setCity('Ibadan');
    setState('Oyo State');
    setContactEmail('info@ibadanpremierhospital.ng');
    setContactPhone('+234 803 918 4420');
    setAdminName('Dr. Babatunde Adelakun');
    setAdminEmail('b.adelakun@ibadanpremierhospital.ng');
    setAdminRoleTitle('Chief Medical Director');
    setSelectedDepartments([
      'General Outpatient (GOPD)',
      'Internal Medicine',
      'Cardiology & Hypertension',
      'Maternal & Antenatal Care',
      'Paediatrics & Child Health',
    ]);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1F33]/65 backdrop-blur-[2px] flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
        className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Top Modal Header */}
        <div className="bg-[#0B1F33] text-white px-4 sm:px-6 py-3.5 sm:py-5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <CornerBriefLogo size="md" theme="dark" variant="glow" />
            <div>
              {registrationSuccessResult ? (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
                      FACILITY REGISTRATION · PENDING APPROVAL
                    </span>
                  </div>
                  <h2 className="font-display text-base sm:text-lg font-bold text-white mt-0.5">
                    Registration Request Submitted
                  </h2>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-[#0E9F9A] font-semibold">
                      CORNERBRIEF REGISTRATION
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-[11px] sm:text-xs font-mono text-slate-300">Step {step} of 4</span>
                  </div>
                  <h2 className="font-display text-base sm:text-lg font-bold text-white mt-0.5">
                    Register Healthcare Facility Workspace
                  </h2>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="cb-icon-btn p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            aria-label="Close facility onboarding"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {registrationSuccessResult ? (
          <div className="p-4 sm:p-8 space-y-5 overflow-y-auto">
            <div className="flex items-start gap-3.5 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-[#0E9F9A]/10 border border-[#0E9F9A]/30">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#0E9F9A] text-white flex items-center justify-center shrink-0 shadow-md">
                <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono uppercase font-bold text-[#0E9F9A] tracking-wider">
                    REGISTRATION RECEIVED
                  </span>
                  <span className="px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold bg-amber-100 text-amber-800 rounded-full border border-amber-300">
                    STATUS: PENDING REVIEW
                  </span>
                </div>
                <h3 className="font-display text-base sm:text-lg font-bold text-[#0B1F33]">
                  {registrationSuccessResult.facility.name}
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  {registrationSuccessResult.message}
                </p>
              </div>
            </div>

            {/* Registration Details Breakdown */}
            <div className="border border-[#E2E8F0] rounded-xl p-4 sm:p-5 bg-[#F8FAFC] space-y-3.5 text-xs">
              <h4 className="font-semibold text-[#0B1F33] uppercase text-[11px] tracking-wider">
                Registration &amp; Hospital Code Record
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-lg border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[10px] uppercase font-medium">Assigned Hospital Code</span>
                  <span className="font-mono text-base font-bold text-[#1769E0]">
                    {registrationSuccessResult.facility.facilityCode}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[10px] uppercase font-medium">System Facility ID</span>
                  <span className="font-mono text-xs font-semibold text-[#0B1F33]">
                    {registrationSuccessResult.facility.id}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[10px] uppercase font-medium">Facility Type &amp; State</span>
                  <span className="font-semibold text-[#0B1F33]">
                    {registrationSuccessResult.facility.facilityType} · {registrationSuccessResult.facility.state}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[10px] uppercase font-medium">Primary Administrator</span>
                  <span className="font-semibold text-[#0B1F33]">
                    {registrationSuccessResult.facility.adminName} ({registrationSuccessResult.facility.adminEmail})
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-[#E2E8F0] sm:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[#64748B] block text-[10px] uppercase font-medium">Storage &amp; Persistence Status</span>
                    <span className="text-xs font-semibold text-[#0B1F33]">
                      {registrationSuccessResult.persistedToFirestore
                        ? 'Permanently recorded in Cloud Firestore database'
                        : 'Active in Server In-Memory Registry (Firestore direct sync pending IAM role)'}
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 text-[10px] font-mono rounded font-semibold self-start sm:self-center shrink-0 ${
                    registrationSuccessResult.persistedToFirestore
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {registrationSuccessResult.persistedToFirestore ? 'FIRESTORE PERSISTED' : 'IN-MEMORY SYNC'}
                  </span>
                </div>
              </div>
            </div>

            {/* Security & Access Notice */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-[#0B1F33] text-white text-xs">
              <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-white">Controlled Activation Lifecycle</div>
                <p className="text-slate-300 leading-relaxed text-xs">
                  In accordance with CornerBrief healthcare governance, newly registered facilities remain in <strong className="text-amber-300 font-semibold">Pending</strong> status until verified by a Platform Administrator. Clinical workspaces, patient encounters, and NONYE AI tools will be unlocked upon institutional approval.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="cb-btn cb-btn-primary w-full sm:w-auto py-3 px-6 text-xs font-semibold rounded-lg min-h-[44px] justify-center"
              >
                Acknowledge &amp; Return to Home
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Step Progress Bar */}
            <div className="bg-[#F6F9FC] border-b border-[#E2E8F0] px-4 sm:px-6 py-2.5 sm:py-3 shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { num: 1, label: '1. Facility Profile' },
                  { num: 2, label: '2. Location & Admin' },
                  { num: 3, label: '3. Clinical Units & Team' },
                  { num: 4, label: '4. Provision Workspace' },
                ].map((item) => {
                  const isCompleted = step > item.num;
                  const isCurrent = step === item.num;
                  return (
                    <div key={item.num} className="space-y-1">
                      <div
                        className={`h-1.5 rounded-full transition-colors duration-200 ${
                          isCompleted
                            ? 'bg-[#0E9F9A]'
                            : isCurrent
                            ? 'bg-[#1769E0]'
                            : 'bg-[#E2E8F0]'
                        }`}
                      />
                      <div
                        className={`text-[10px] sm:text-[11px] font-semibold truncate ${
                          isCurrent
                            ? 'text-[#0B1F33]'
                            : isCompleted
                            ? 'text-[#0E9F9A]'
                            : 'text-[#64748B]'
                        }`}
                      >
                        {item.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          {error && (
            <div className="p-3.5 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/30 text-xs text-[#DC2626] font-medium">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            {step === 1 && (
              <motion.div
                key="onboarding-step-1"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                className="space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                  <div>
                    <h3 className="font-display text-base font-bold text-[#0B1F33]">
                      Healthcare Facility Identity &amp; Classification
                    </h3>
                    <p className="text-xs text-[#64748B]">
                      Each registered hospital or clinic receives an isolated CornerBrief clinical record workspace.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fillQuickHospitalPreset}
                    className="cb-btn cb-btn-secondary py-1.5 px-3 text-[11px] font-semibold rounded-lg whitespace-nowrap shrink-0"
                  >
                    Fill Sample Nigerian Hospital
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#17212B] mb-1">
                      Official Facility Name <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      value={facilityName}
                      onChange={(e) => setFacilityName(e.target.value)}
                      placeholder="e.g. St. Nicholas Specialist Hospital or Victoria Island Medical Clinic"
                      className="cb-input w-full px-3.5 py-2.5 text-sm rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#17212B] mb-1">
                      Patient ID Prefix Code
                    </label>
                    <input
                      type="text"
                      value={facilityCode}
                      onChange={(e) => setFacilityCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SNSH-LAG"
                      className="cb-input w-full px-3.5 py-2.5 text-sm font-mono rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#17212B] mb-2">
                    Facility Classification <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {FACILITY_TYPES.map((item) => {
                      const active = facilityType === item.type;
                      return (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => handleSelectFacilityType(item.type)}
                          className={`cb-card-interactive text-left p-4 rounded-xl border ${
                            active
                              ? 'border-[#1769E0] bg-[#1769E0]/5 shadow-xs'
                              : 'border-[#E2E8F0] bg-[#F6F9FC]/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-[#0B1F33]">{item.title}</span>
                            {active && <CheckCircle2 className="w-4 h-4 text-[#1769E0] shrink-0" />}
                          </div>
                          <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                            {item.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="onboarding-step-2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                className="space-y-5"
              >
                <div className="pb-2 border-b border-[#E2E8F0]">
                  <h3 className="font-display text-base font-bold text-[#0B1F33]">
                    Facility Location &amp; Primary Administrator
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Configure your facility&apos;s physical address in Nigeria and primary administrative lead.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#17212B] mb-1">
                      Street Address <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. 24B Awolowo Road, Ikoyi"
                      className="cb-input w-full px-3.5 py-2 text-sm rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#17212B] mb-1">
                      City / Town <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Lagos, Abuja, Port Harcourt"
                      className="cb-input w-full px-3.5 py-2 text-sm rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#17212B] mb-1">
                      State <span className="text-[#DC2626]">*</span>
                    </label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="cb-input w-full px-3.5 py-2 text-sm rounded-lg"
                    >
                      {NIGERIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#17212B] mb-1">
                      Facility Official Phone
                    </label>
                    <input
                      type="text"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+234 803 000 0000"
                      className="cb-input w-full px-3.5 py-2 text-sm font-mono rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#17212B] mb-1">
                      Facility Official Email
                    </label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="records@yourfacility.ng"
                      className="cb-input w-full px-3.5 py-2 text-sm rounded-lg"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3">
                    Primary Facility Administrator (Workspace Owner)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#17212B] mb-1">
                        Administrator Full Name <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        type="text"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="e.g. Dr. Tunde Bakare"
                        className="cb-input w-full px-3 py-2 text-xs rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#17212B] mb-1">
                        Administrator Email <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@yourfacility.ng"
                        className="cb-input w-full px-3 py-2 text-xs rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#17212B] mb-1">
                        Designation / Title
                      </label>
                      <input
                        type="text"
                        value={adminRoleTitle}
                        onChange={(e) => setAdminRoleTitle(e.target.value)}
                        placeholder="Medical Director / Admin"
                        className="cb-input w-full px-3 py-2 text-xs rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="onboarding-step-3"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                className="space-y-5"
              >
                <div className="pb-2 border-b border-[#E2E8F0]">
                  <h3 className="font-display text-base font-bold text-[#0B1F33]">
                    Clinical Departments &amp; Initial Healthcare Team
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Select active service units and pre-authorize clinicians or records staff for {facilityName || 'your facility'}.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#17212B] mb-2">
                    Active Clinical Departments ({selectedDepartments.length} selected)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {NIGERIA_CLINICAL_DEPARTMENTS.map((dept) => {
                      const isSelected = selectedDepartments.includes(dept);
                      return (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => toggleDepartment(dept)}
                          className={`text-left px-3 py-2 rounded-lg border text-xs font-medium flex items-center justify-between gap-2 transition-colors duration-150 ${
                            isSelected
                              ? 'border-[#0E9F9A] bg-[#0E9F9A]/10 text-[#0B1F33] font-semibold'
                              : 'border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#0B1F33]'
                          }`}
                        >
                          <span className="truncate">{dept}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#0E9F9A] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Department Addition */}
                  <div className="mt-2.5 flex items-center gap-2">
                    <input
                      type="text"
                      value={customDepartment}
                      onChange={(e) => setCustomDepartment(e.target.value)}
                      placeholder="Add another clinical unit (e.g. Obstetrics, Orthopedics, Dental)..."
                      className="cb-input flex-1 px-3 py-1.5 text-xs rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomDepartment}
                      className="cb-btn cb-btn-secondary py-1.5 px-3 text-xs font-semibold rounded-lg gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Unit</span>
                    </button>
                  </div>
                </div>

                {/* Initial Staff Directory */}
                <div className="pt-3 border-t border-[#E2E8F0] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#1769E0]" />
                      <h4 className="text-xs font-bold text-[#0B1F33]">
                        Initial Clinicians &amp; Records Staff (Optional)
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddStaffRow}
                      className="cb-btn cb-btn-secondary py-1 px-2.5 text-xs font-semibold rounded-md gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Team Member</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {initialStaff.map((member, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-[#F6F9FC] p-2.5 rounded-lg border border-[#E2E8F0]"
                      >
                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) => handleUpdateStaffRow(idx, 'name', e.target.value)}
                          placeholder="Full name (e.g. Dr. Kemi Adebisi)"
                          className="cb-input sm:col-span-4 px-2.5 py-1.5 text-xs rounded-md"
                        />
                        <input
                          type="email"
                          value={member.email}
                          onChange={(e) => handleUpdateStaffRow(idx, 'email', e.target.value)}
                          placeholder="Email address"
                          className="cb-input sm:col-span-4 px-2.5 py-1.5 text-xs rounded-md"
                        />
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleUpdateStaffRow(idx, 'role', e.target.value as UserRole)
                          }
                          className="cb-input sm:col-span-3 px-2.5 py-1.5 text-xs rounded-md"
                        >
                          <option value="Clinician">Clinician</option>
                          <option value="Staff">Records Staff</option>
                          <option value="Admin">Admin</option>
                        </select>
                        <div className="sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveStaffRow(idx)}
                            className="cb-icon-btn p-1.5 text-[#64748B] hover:text-[#DC2626] rounded-md"
                            aria-label="Remove staff member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="onboarding-step-4"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                className="space-y-5"
              >
                <div className="pb-2 border-b border-[#E2E8F0]">
                  <h3 className="font-display text-base font-bold text-[#0B1F33]">
                    Review &amp; Provision Dedicated Facility Workspace
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Verify your facility configuration below before launching your private CornerBrief workspace.
                  </p>
                </div>

                <div className="bg-[#F6F9FC] border border-[#E2E8F0] rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#64748B] block">Facility Name &amp; Type</span>
                    <strong className="text-[#0B1F33] text-sm font-bold block mt-0.5">
                      {facilityName}
                    </strong>
                    <span className="font-mono text-[#1769E0] text-[11px]">
                      {facilityType} · Code: {facilityCode || 'CB-FAC'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#64748B] block">Location</span>
                    <strong className="text-[#0B1F33] block mt-0.5">
                      {address}, {city}, {state}
                    </strong>
                    <span className="font-mono text-[#64748B] text-[11px]">
                      {contactPhone} · {contactEmail || adminEmail}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#64748B] block">Primary Facility Administrator</span>
                    <strong className="text-[#0B1F33] block mt-0.5">{adminName}</strong>
                    <span className="text-[#64748B] text-[11px]">
                      {adminRoleTitle} ({adminEmail})
                    </span>
                  </div>

                  <div>
                    <span className="text-[#64748B] block">
                      Active Clinical Departments ({selectedDepartments.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedDepartments.map((dept) => (
                        <span
                          key={dept}
                          className="text-[11px] bg-white border border-[#E2E8F0] px-2 py-0.5 rounded text-[#0B1F33] font-medium"
                        >
                          {dept}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Starter Sample Patients Option */}
                <label className="flex items-start gap-3 p-4 rounded-xl border border-[#E2E8F0] bg-white hover:border-[#CBD5E1] cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={includeStarterPatients}
                    onChange={(e) => setIncludeStarterPatients(e.target.checked)}
                    className="mt-0.5 rounded border-[#E2E8F0] text-[#1769E0] focus:ring-[#1769E0]"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-[#0B1F33] block">
                      Initialize with 2 starter synthetic patients &amp; sample clinical encounter
                    </span>
                    <span className="text-[#64748B] block mt-0.5">
                      Recommended for immediate evaluation of patient timelines, encounter recording, and NONYE AI structured documentation inside your new facility workspace.
                    </span>
                  </div>
                </label>

                {/* Tenant Isolation & Safety Assurance */}
                <div className="bg-[#0B1F33] text-white rounded-xl p-4 flex items-start gap-3 text-xs">
                  <ShieldCheck className="w-5 h-5 text-[#0E9F9A] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span>Strict Multi-Hospital Data Isolation &amp; NONYE AI Governance</span>
                      <Lock className="w-3.5 h-3.5 text-[#0E9F9A]" />
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      Patient records, clinical encounters, and audit logs created inside{' '}
                      <strong className="text-white">{facilityName}</strong> are scoped strictly to this facility ID. All NONYE AI outputs require clinician review and sign-off before finalization.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Navigation Controls */}
          <div className="pt-4 border-t border-[#E2E8F0] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePreviousStep}
                disabled={isSubmitting}
                className="cb-btn cb-btn-secondary py-2.5 px-4 text-xs font-semibold rounded-lg gap-1.5 min-h-[44px] justify-center"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous Step</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="cb-btn cb-btn-secondary py-2.5 px-4 text-xs font-semibold rounded-lg min-h-[44px] justify-center"
              >
                Cancel
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="cb-btn cb-btn-primary py-2.5 px-5 text-xs font-semibold rounded-lg gap-1.5 min-h-[44px] justify-center"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="cb-btn cb-btn-teal py-2.5 px-6 text-xs font-semibold rounded-lg gap-2 min-h-[44px] justify-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Registration...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Submit Facility for Registration</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </>
    )}
  </motion.div>
</div>
  );
};
