import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  FileCheck,
  FileText,
  Filter,
  Heart,
  HelpCircle,
  History,
  Info,
  KeyRound,
  Lock,
  Menu,
  Plus,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { Facility, FacilityType, UserRole } from '../types';
import { CornerBriefLogo } from './CornerBriefLogo';
import { CORNERBRIEF_ASSETS } from '../constants/assets';

interface LoginScreenProps {
  facilities: Facility[];
  onStaffSignIn?: (hospitalCode: string, username: string, password: string) => Promise<void>;
  onDemoSignIn: (role: UserRole, facilityId?: string) => void;
  onOpenRegisterFacility: (defaultType?: FacilityType) => void;
  authError: string | null;
  isAuthenticating: boolean;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const HOSPITAL_ACTIVITY_SCENES = [
  {
    id: 'emergency-triage',
    asset: CORNERBRIEF_ASSETS.emergencyTriageTeam,
    badgeText: 'ACUTE EMERGENCY TRIAGE',
    badgeTone: 'urgent',
    department: 'Accident & Emergency (A&E)',
    highlights: [
      'Physiological Triage (Levels 1-5)',
      'Real-time telemetry monitor integration',
      'Fast-track clinician handover note',
    ],
  },
  {
    id: 'ward-rounds',
    asset: CORNERBRIEF_ASSETS.wardRoundsCollaborative,
    badgeText: 'MULTIDISCIPLINARY WARD ROUNDS',
    badgeTone: 'blue',
    department: 'Inpatient Medical-Surgical Ward',
    highlights: [
      'Bedside digital chart review',
      'Attending physician + Charge nurse synchronization',
      'Longitudinal encounter timeline',
    ],
  },
  {
    id: 'bedside-nursing',
    asset: CORNERBRIEF_ASSETS.caringTeamBedside,
    badgeText: 'BEDSIDE NURSING & TELEMETRY',
    badgeTone: 'green',
    department: 'Inpatient Recovery & High Dependency',
    highlights: [
      'Continuous cardiac & vital signs monitoring',
      'Post-procedure empathetic recovery',
      'Medication administration verification',
    ],
  },
  {
    id: 'outpatient-consultation',
    asset: CORNERBRIEF_ASSETS.heroDoctorConsultation,
    badgeText: 'OUTPATIENT & NONYE AI SUITE',
    badgeTone: 'purple',
    department: 'Specialist Consultation Clinics',
    highlights: [
      'Clinician-supervised documentation',
      'Structured SOAP & encounter synthesis',
      'Audit-locked permanent record',
    ],
  },
];

export const LoginScreen: React.FC<LoginScreenProps> = ({
  facilities,
  onStaffSignIn,
  onDemoSignIn,
  onOpenRegisterFacility,
  authError,
  isAuthenticating,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(
    facilities[0]?.id || ''
  );
  const [activeSceneId, setActiveSceneId] = useState<string>('emergency-triage');

  // Staff Hospital Code + Username + Password Authentication State
  const [hospitalCode, setHospitalCode] = useState<string>(
    facilities[0]?.facilityCode || 'LLSC-VI'
  );
  const [username, setUsername] = useState<string>('adaeze.okafor');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [localValidationError, setLocalValidationError] = useState<string | null>(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState<boolean>(false);

  const handleStaffFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalValidationError(null);

    const cleanCode = hospitalCode.trim().toUpperCase();
    if (!cleanCode) {
      setLocalValidationError('Please enter your Hospital Code (e.g., LLSC-VI, ACCH-ABJ).');
      return;
    }
    if (!/^[A-Z0-9-]{3,12}$/.test(cleanCode)) {
      setLocalValidationError(
        'Hospital Code must be 3-12 characters and contain only uppercase letters, numbers, and hyphens.'
      );
      return;
    }

    const cleanUser = username.trim();
    if (!cleanUser || cleanUser.length < 3) {
      setLocalValidationError('Please enter your staff username (at least 3 characters).');
      return;
    }

    if (!password) {
      setLocalValidationError('Please enter your account password.');
      return;
    }

    if (onStaffSignIn) {
      await onStaffSignIn(cleanCode, cleanUser, password);
    }
  };

  const selectedFacility =
    facilities.find((f) => f.id === selectedFacilityId) || facilities[0];

  const activeScene =
    HOSPITAL_ACTIVITY_SCENES.find((s) => s.id === activeSceneId) ||
    HOSPITAL_ACTIVITY_SCENES[0];

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9FC] text-[#17212B] flex flex-col font-sans selection:bg-[#1769E0]/15 selection:text-[#0B1F33]">
      {/* ========================================================= */}
      {/* 1. TOP GLOBAL NAVIGATION HEADER                           */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Bold Official Logo */}
            <CornerBriefLogo
              size="md"
            />

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-[#64748B]">
              <button
                type="button"
                onClick={() => scrollToSection('hospital-scenes')}
                className="hover:text-[#0B1F33] transition-colors cursor-pointer py-1"
              >
                Hospital Activities
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('care-journey')}
                className="hover:text-[#0B1F33] transition-colors cursor-pointer py-1"
              >
                Care Journey
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('capabilities')}
                className="hover:text-[#0B1F33] transition-colors cursor-pointer py-1"
              >
                Capabilities
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('nonye-ai')}
                className="hover:text-[#0B1F33] transition-colors cursor-pointer py-1"
              >
                NONYE AI Assistant
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('security')}
                className="hover:text-[#0B1F33] transition-colors cursor-pointer py-1"
              >
                Security &amp; Isolation
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('workspace-access')}
                className="hover:text-[#0B1F33] transition-colors cursor-pointer py-1"
              >
                Workspaces
              </button>
            </nav>

            {/* Desktop Action Buttons */}
            <div className="hidden sm:flex items-center gap-3">
              <button
                type="button"
                onClick={() => scrollToSection('workspace-access')}
                className="cb-btn cb-btn-secondary text-xs px-3.5 py-2 font-semibold rounded-lg"
              >
                <span>Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenRegisterFacility('Hospital')}
                className="cb-btn cb-btn-primary text-xs px-4 py-2 font-semibold rounded-lg gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Your Facility</span>
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <div className="flex sm:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-[#0B1F33] hover:bg-slate-100 transition-colors"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-[#E2E8F0] bg-white px-4 py-4 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <CornerBriefLogo size="sm" variant="glow" />
            </div>
            <div className="flex flex-col gap-2 text-sm font-medium text-[#17212B]">
              <button
                type="button"
                onClick={() => scrollToSection('hospital-scenes')}
                className="text-left py-2 hover:text-[#1769E0]"
              >
                Hospital Activities
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('care-journey')}
                className="text-left py-2 hover:text-[#1769E0]"
              >
                Care Journey
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('capabilities')}
                className="text-left py-2 hover:text-[#1769E0]"
              >
                Platform Capabilities
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('nonye-ai')}
                className="text-left py-2 hover:text-[#1769E0]"
              >
                NONYE AI Assistant
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('security')}
                className="text-left py-2 hover:text-[#1769E0]"
              >
                Security &amp; Data Governance
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('workspace-access')}
                className="text-left py-2 hover:text-[#1769E0]"
              >
                Workspace Sign-In
              </button>
            </div>
            <div className="pt-3 border-t border-[#E2E8F0] flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onOpenRegisterFacility('Hospital')}
                className="cb-btn cb-btn-primary w-full py-2.5 text-xs font-semibold rounded-lg justify-center"
              >
                <span>Register Your Facility</span>
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('workspace-access')}
                className="cb-btn cb-btn-secondary w-full py-2.5 text-xs font-semibold rounded-lg justify-center"
              >
                <span>Sign In to Workspace</span>
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* ========================================================= */}
        {/* 2. HERO SECTION: INTERNATIONAL HOSPITAL WORKSPACE         */}
        {/* ========================================================= */}
        <section className="relative overflow-hidden bg-white border-b border-[#E2E8F0] pt-12 pb-16 lg:pt-20 lg:pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              {/* Left Column: Mission & Core Value */}
              <div className="lg:col-span-6 space-y-6 text-left">
                <div className="flex items-center">
                  <CornerBriefLogo size="lg" />
                </div>

                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0B1F33] tracking-tight leading-[1.12]">
                  Healthcare records.{' '}
                  <span className="text-[#1769E0]">Documentation.</span> Operations. Connected.
                </h1>

                <p className="text-base sm:text-lg text-[#64748B] leading-relaxed max-w-xl">
                  CornerBrief powers hospitals, clinics, and specialist centres with an international digital workspace that unifies patient care, emergency triage, bedside ward rounds, and clinician-supervised documentation.
                </p>

                {/* Primary Actions: Clear Entry Points for Existing Staff & New Facilities */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => scrollToSection('workspace-access')}
                    className="cb-btn cb-btn-primary cb-btn-shine py-3.5 px-6 text-sm font-semibold rounded-xl gap-2 shadow-md group justify-center cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenRegisterFacility('Hospital')}
                    className="cb-btn cb-btn-secondary py-3.5 px-6 text-sm font-semibold rounded-xl gap-2 justify-center group cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 text-[#1769E0] transition-transform duration-300 group-hover:scale-110" />
                    <span>Register Your Facility</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollToSection('hospital-scenes')}
                    className="cb-btn cb-btn-secondary py-3.5 px-5 text-sm font-semibold rounded-xl gap-2 justify-center group hidden lg:inline-flex cursor-pointer"
                  >
                    <Activity className="w-4 h-4 text-[#0E9F9A] transition-transform duration-300 group-hover:scale-110" />
                    <span>Hospital Activities</span>
                  </button>
                </div>

                {/* Clinical Credibility Points */}
                <div className="pt-4 border-t border-[#E2E8F0] grid grid-cols-3 gap-4 text-left">
                  <div>
                    <div className="text-base sm:text-lg font-extrabold text-[#0B1F33]">
                      Inpatient &amp; ER
                    </div>
                    <div className="text-[11px] text-[#64748B]">Continuous Clinical Care</div>
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-extrabold text-[#0B1F33]">
                      NONYE AI
                    </div>
                    <div className="text-[11px] text-[#64748B]">Clinician-Supervised</div>
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-extrabold text-[#0B1F33]">
                      Multi-Tenant
                    </div>
                    <div className="text-[11px] text-[#64748B]">Isolated Workspaces</div>
                  </div>
                </div>
              </div>

              {/* Right Column: Hero Visual featuring Real Hospital Clinical Care */}
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.65, ease: EASE_OUT_EXPO }}
                className="lg:col-span-6 relative"
              >
                <div className="relative rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-xl bg-[#0B1F33]/5 group cb-image-frame">
                  <img
                    src={CORNERBRIEF_ASSETS.heroDoctorConsultation.src}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.endsWith(CORNERBRIEF_ASSETS.heroDoctorConsultation.fallbackSrc)) {
                        target.src = CORNERBRIEF_ASSETS.heroDoctorConsultation.fallbackSrc;
                      }
                    }}
                    alt={CORNERBRIEF_ASSETS.heroDoctorConsultation.alt}
                    className="w-full h-auto object-cover max-h-[460px] sm:max-h-[500px]"
                    referrerPolicy="no-referrer"
                  />

                  {/* Top Live Care Status Overlay (Floating) */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none cb-float-badge">
                    <div className="bg-[#0B1F33]/85 backdrop-blur-md text-white text-[11px] font-mono px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-ping" />
                      <span>LIVE CLINICAL CONSULTATION</span>
                    </div>
                    <div className="bg-white/95 backdrop-blur-md text-[#0B1F33] text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-[#E2E8F0] shadow-xs">
                      Consultation Suite · Attending Physician
                    </div>
                  </div>

                  {/* Bottom Clinical Care Metric Banner (Floating delayed) */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-xl p-3.5 border border-[#E2E8F0] shadow-lg cb-float-badge-delayed">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#0B1F33] pb-2 border-b border-slate-100">
                      <span className="flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-[#DC2626]" />
                        <span>Patient: Amina Okonkwo (Age 34)</span>
                      </span>
                      <span className="text-[11px] text-[#0E9F9A] font-mono">
                        Vitals Stable
                      </span>
                    </div>
                    <div className="pt-2 flex items-center justify-between text-[11px] text-[#64748B]">
                      <span>BP: 118/76 mmHg · HR: 72 bpm · SpO2: 98%</span>
                      <span className="font-semibold text-[#1769E0] flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#0E9F9A]" />
                        NONYE AI Structuring Ready
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. HOSPITAL ACTIVITIES & CLINICAL CARE IN MOTION          */}
        {/* ========================================================= */}
        <section
          id="hospital-scenes"
          className="py-16 lg:py-24 bg-[#F6F9FC] border-b border-[#E2E8F0]"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-3xl space-y-3">
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0B1F33] tracking-tight">
                Representing the full spectrum of modern hospital activities.
              </h2>
              <p className="text-sm sm:text-base text-[#64748B] leading-relaxed">
                From emergency triage to inpatient ward rounds and specialist surgical theatres, CornerBrief supports every phase of patient care and healthcare operations.
              </p>
            </div>

            {/* Scene Selector Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-[#E2E8F0] pb-4">
              {HOSPITAL_ACTIVITY_SCENES.map((scene) => {
                const isActive = scene.id === activeSceneId;
                return (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => setActiveSceneId(scene.id)}
                    className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-[#0B1F33] text-white shadow-sm'
                        : 'bg-white text-[#64748B] hover:text-[#0B1F33] border border-[#E2E8F0] hover:border-slate-300'
                    }`}
                  >
                    <span>{scene.asset.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Scene Spotlight */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 lg:p-8 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7">
                  <div className="relative rounded-xl overflow-hidden border border-[#E2E8F0] shadow-md bg-slate-900 cb-image-frame">
                    <img
                      src={activeScene.asset.src}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.endsWith(activeScene.asset.fallbackSrc)) {
                          target.src = activeScene.asset.fallbackSrc;
                        }
                      }}
                      alt={activeScene.asset.alt}
                      className="w-full h-auto object-cover max-h-[420px]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3 bg-[#0B1F33]/85 backdrop-blur-md text-white text-[11px] font-mono px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 cb-float-badge">
                      <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-ping" />
                      <span>{activeScene.badgeText}</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-5 text-left">
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#1769E0] font-semibold">
                      {activeScene.department}
                    </span>
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-[#0B1F33]">
                      {activeScene.asset.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                      {activeScene.asset.description}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
                    <span className="text-[11px] font-mono font-bold text-[#0B1F33] uppercase">
                      Clinical Operational Highlights
                    </span>
                    <ul className="space-y-2">
                      {activeScene.highlights.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs text-[#17212B]"
                        >
                          <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-[#F6F9FC] rounded-xl border border-[#E2E8F0] text-[11px] font-mono text-[#64748B]">
                    <strong>Care Context:</strong> {activeScene.asset.clinicalContext}
                  </div>
                </div>
              </div>
            </div>

            {/* 4-Card Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {HOSPITAL_ACTIVITY_SCENES.map((scene) => {
                const isSelected = scene.id === activeSceneId;
                return (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => setActiveSceneId(scene.id)}
                    className={`text-left p-4 rounded-xl border transition-all cursor-pointer bg-white group ${
                      isSelected
                        ? 'border-[#1769E0] ring-2 ring-[#1769E0]/20 shadow-sm'
                        : 'border-[#E2E8F0] hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="relative rounded-lg overflow-hidden border border-slate-200 mb-3 aspect-video bg-slate-100 cb-image-frame">
                      <img
                        src={scene.asset.src}
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.src.endsWith(scene.asset.fallbackSrc)) {
                            target.src = scene.asset.fallbackSrc;
                          }
                        }}
                        alt={scene.asset.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#1769E0] font-semibold mb-1">
                      {scene.department.split('(')[0].trim()}
                    </div>
                    <div className="font-display text-xs font-bold text-[#0B1F33] group-hover:text-[#1769E0] transition-colors">
                      {scene.asset.title}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. CARE JOURNEY CONTINUUM (PANORAMIC)                     */}
        {/* ========================================================= */}
        <section
          id="care-journey"
          className="py-16 lg:py-24 bg-white border-b border-[#E2E8F0]"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-3xl space-y-3">
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0B1F33] tracking-tight">
                One unified platform powering every phase of healthcare delivery.
              </h2>
              <p className="text-sm sm:text-base text-[#64748B] leading-relaxed">
                Experience seamless clinical continuity across outpatient consultations, specialized surgical theatres, diagnostic telemetry, and multidisciplinary inpatient recovery.
              </p>
            </div>

            {/* Panoramic Visual Banner */}
            <div className="relative rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-lg bg-slate-900 group cb-image-frame">
              <img
                src={CORNERBRIEF_ASSETS.careJourneyPanoramic.src}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith(CORNERBRIEF_ASSETS.careJourneyPanoramic.fallbackSrc)) {
                    target.src = CORNERBRIEF_ASSETS.careJourneyPanoramic.fallbackSrc;
                  }
                }}
                alt={CORNERBRIEF_ASSETS.careJourneyPanoramic.alt}
                className="w-full h-auto object-cover max-h-[460px] sm:max-h-[520px]"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F33]/85 via-transparent to-transparent flex items-end p-6 sm:p-8">
                <div className="text-white max-w-2xl space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#0E9F9A] bg-[#0E9F9A]/20 px-2.5 py-1 rounded-md font-semibold">
                    CONNECTED CLINICAL CONTINUUM
                  </span>
                  <h3 className="font-display text-lg sm:text-2xl font-bold">
                    Triage &middot; Surgical Theatres &middot; Radiology Telemetry &middot; Inpatient Recovery
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    CornerBrief links cross-departmental documentation so attending physicians, nurses, and specialists always maintain complete situational awareness.
                  </p>
                </div>
              </div>
            </div>

            {/* Continuum Workflow Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  stage: 'Stage 1',
                  name: 'Intake & Acute Triage',
                  desc: 'Patient presentation, physiological acuity indexing (Levels 1-5), and initial vital signs capture.',
                },
                {
                  stage: 'Stage 2',
                  name: 'Clinical Consultation',
                  desc: 'Attending physician examination, diagnostic review, and NONYE AI structured SOAP note synthesis.',
                },
                {
                  stage: 'Stage 3',
                  name: 'Inpatient Ward Rounds',
                  desc: 'Multidisciplinary team rounds, digital bedside medication charts, and care plan updates.',
                },
                {
                  stage: 'Stage 4',
                  name: 'Recovery & Discharge',
                  desc: 'Continuous nursing telemetry, clinician verification lock, and follow-up care summaries.',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#F6F9FC] border border-[#E2E8F0] rounded-xl p-5 space-y-2"
                >
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#1769E0]">
                    {item.stage}
                  </span>
                  <h4 className="font-display text-sm font-bold text-[#0B1F33]">
                    {item.name}
                  </h4>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 5. PLATFORM CAPABILITIES                                  */}
        {/* ========================================================= */}
        <section
          id="capabilities"
          className="py-16 lg:py-24 bg-white border-b border-[#E2E8F0]"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="max-w-3xl space-y-3">
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0B1F33] tracking-tight">
                Everything your healthcare facility needs in one connected workspace.
              </h2>
              <p className="text-sm sm:text-base text-[#64748B] leading-relaxed">
                Connect patient intake, vital signs, clinical encounters, department workflows, and facility administration without fragmented spreadsheets or isolated paper files.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {[
                {
                  icon: Building2,
                  title: 'Multi-Tenant Isolation',
                  desc: 'Dedicated facility data boundaries. Records, staff credentials, and encounters remain strictly confined to each registered healthcare facility.',
                },
                {
                  icon: Users,
                  title: 'Dynamic Staff Assignment',
                  desc: 'Flexible staff scheduling and department rosters allow physicians and nurses to manage wards, triage, and consultation queues seamlessly.',
                },
                {
                  icon: Activity,
                  title: 'Structured Clinical Encounters',
                  desc: 'Capture vitals, chief complaints, physical examinations, and treatment plans in structured formats ready for audit and peer review.',
                },
                {
                  icon: History,
                  title: 'Longitudinal Medical Timelines',
                  desc: 'Complete chronological patient history across previous hospital admissions, clinical encounters, diagnoses, and lab results.',
                },
                {
                  icon: Filter,
                  title: 'Granular Role Hydration',
                  desc: 'Role-based access permissions tailored for Doctors, Nurses, Records Officers, Facility Administrators, and System Admins.',
                },
                {
                  icon: FileText,
                  title: 'Audit & Revision Stamping',
                  desc: 'Immutable audit logs track every clinical edit, NONYE AI generation, and administrative action with precise timestamps and user IDs.',
                },
              ].map((feat, idx) => (
                <div
                  key={idx}
                  className="bg-[#F6F9FC] border border-[#E2E8F0] rounded-2xl p-6 sm:p-7 space-y-4 hover:shadow-md transition-shadow group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center text-[#1769E0] group-hover:scale-105 transition-transform shadow-2xs">
                    <feat.icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-display text-base font-bold text-[#0B1F33]">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 6. NONYE AI: CLINICIAN-SUPERVISED DOCUMENTATION ASSISTANT */}
        {/* ========================================================= */}
        <section
          id="nonye-ai"
          className="py-16 lg:py-24 bg-[#FAFBFD] border-b border-[#E2E8F0]"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
            <div className="max-w-3xl space-y-3">
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0B1F33] tracking-tight">
                NONYE AI: Structured clinical documentation, with clinicians in control.
              </h2>
              <p className="text-sm sm:text-base text-[#64748B] leading-relaxed">
                NONYE AI assists licensed healthcare professionals by converting unstructured consultation observations into standardized clinical documentation — without hallucinating diagnoses or bypassing human clinical judgment.
              </p>
            </div>

            {/* 4-Step Clinical Workflow */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  step: '01',
                  name: 'CAPTURE',
                  title: 'Record Clinical Observations',
                  desc: 'Clinicians enter consultation findings, triage notes, and vital signs. Original notes are permanently preserved verbatim.',
                },
                {
                  step: '02',
                  name: 'STRUCTURE',
                  title: 'Synthesize Clinical Sections',
                  desc: 'NONYE AI organizes observations into History of Present Illness, Objective Exam, Assessment, and Plan, flagging any missing vitals.',
                },
                {
                  step: '03',
                  name: 'REVIEW',
                  title: 'Clinician Verification',
                  desc: 'The attending healthcare provider reviews, edits, and verifies the generated summary against patient observations.',
                },
                {
                  step: '04',
                  name: 'FINALIZE',
                  title: 'Immutable Clinical Lock',
                  desc: 'Authorized clinicians sign and lock the record into the patient’s permanent timeline with digital audit logs.',
                },
              ].map((stage) => (
                <div
                  key={stage.step}
                  className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xl font-extrabold text-[#1769E0]">
                      {stage.step}
                    </span>
                    <span className="text-[10px] font-mono tracking-wider font-bold text-[#0E9F9A] bg-[#0E9F9A]/10 px-2 py-0.5 rounded uppercase">
                      {stage.name}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-[#0B1F33]">
                      {stage.title}
                    </h3>
                    <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
                      {stage.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Clinical Safety Protocol Notice */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#0B1F33]">
                  <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                  <span>RESPONSIBLE HEALTHCARE INFORMATION SAFETY COMMITMENT</span>
                </div>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  CornerBrief is strictly engineered around patient safety. NONYE AI does not generate autonomous medical diagnoses or unverified drug dosages. Mandatory clinician review and signature are required before any record becomes finalized.
                </p>
              </div>

              <div className="text-xs font-mono text-[#64748B] bg-[#F6F9FC] border border-[#E2E8F0] px-4 py-2.5 rounded-xl shrink-0">
                Audit Trail · Version Control · Immutable Locking
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 6. SECURITY & DATA GOVERNANCE                             */}
        {/* ========================================================= */}
        <section
          id="security"
          className="py-16 lg:py-24 bg-white border-b border-[#E2E8F0]"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-3xl space-y-3">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1F33] tracking-tight">
                Designed for international healthcare data protection.
              </h2>
              <p className="text-sm text-[#64748B] leading-relaxed">
                Healthcare information requires uncompromising isolation, encryption, and auditability. CornerBrief is built from the ground up to protect patient confidentiality.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-[#F6F9FC] border border-[#E2E8F0] space-y-3">
                <Shield className="w-6 h-6 text-[#1769E0]" />
                <h3 className="font-display text-base font-bold text-[#0B1F33]">
                  Tenant Isolation
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Each hospital and clinic operates within its own dedicated workspace. Medical records, patient lists, and clinical encounters are never shared or cross-contaminated across facilities.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#F6F9FC] border border-[#E2E8F0] space-y-3">
                <Lock className="w-6 h-6 text-[#0E9F9A]" />
                <h3 className="font-display text-base font-bold text-[#0B1F33]">
                  TLS 1.3 &amp; Encryption at Rest
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  All clinical information transmitted between browsers and cloud databases is encrypted with modern TLS protocols and protected by cloud infrastructure access controls.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#F6F9FC] border border-[#E2E8F0] space-y-3">
                <FileCheck className="w-6 h-6 text-[#0B1F33]" />
                <h3 className="font-display text-base font-bold text-[#0B1F33]">
                  Role-Based Access &amp; Audit Logs
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Granular role permissions ensure only authorized clinicians review clinical encounters, while records staff manage intake. Every edit is stamped in immutable audit logs.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 7. CLEAN WORKSPACE SIGN-IN & FACILITY REGISTRATION         */}
        {/* ========================================================= */}
        <section
          id="workspace-access"
          className="py-16 lg:py-24 bg-[#F6F9FC] border-b border-[#E2E8F0]"
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="flex flex-col items-center justify-center text-center space-y-3">
              <CornerBriefLogo size="xl" />
              <span className="text-xs font-mono uppercase tracking-wider text-[#1769E0] font-semibold">
                INTERNATIONAL HEALTHCARE PORTAL ACCESS
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1F33]">
                Sign In to Your Facility Workspace
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] max-w-lg mx-auto leading-relaxed">
                Select your registered healthcare facility below to authenticate and enter your secure clinical records workspace.
              </p>
            </div>

            {/* Dedicated Hospital Staff Sign-In Card */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-lg p-5 sm:p-8 lg:p-10 space-y-6">
              {/* Card Header */}
              <div className="flex items-center gap-3.5 pb-5 border-b border-[#E2E8F0]">
                <div className="w-11 h-11 rounded-xl bg-[#1769E0]/10 border border-[#1769E0]/20 flex items-center justify-center text-[#1769E0] shrink-0 shadow-xs">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg sm:text-xl font-bold text-[#0B1F33]">
                    Hospital Staff Sign-In
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Authenticate using your facility-assigned Hospital Code, staff username, and password.
                  </p>
                </div>
              </div>

              {(localValidationError || authError) && (
                <div className="p-3.5 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/30 flex items-start gap-2.5 text-xs text-[#DC2626] font-medium leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{localValidationError || authError}</span>
                </div>
              )}

              {/* Hospital Code + Username + Password Form */}
              <form onSubmit={handleStaffFormSubmit} className="space-y-4">
                {/* Hospital Code Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="hospital-code-input"
                      className="block text-xs font-bold text-[#0B1F33]"
                    >
                      Hospital Code
                    </label>
                    <span className="text-[11px] font-mono text-[#64748B]">
                      3–12 uppercase characters (e.g. LLSC-VI)
                    </span>
                  </div>
                  <input
                    type="text"
                    id="hospital-code-input"
                    inputMode="text"
                    autoCapitalize="characters"
                    autoComplete="organization"
                    spellCheck={false}
                    value={hospitalCode}
                    onChange={(e) => setHospitalCode(e.target.value.toUpperCase())}
                    placeholder="e.g. LLSC-VI, ACCH-ABJ, PRMC-PHC"
                    className="cb-input w-full px-4 py-3 text-sm font-mono uppercase font-semibold rounded-xl tracking-wider"
                    required
                  />

                  {/* Quick Hospital Code Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-[#64748B] font-medium">Quick Select:</span>
                    {facilities.map((fac) => {
                      const code =
                        fac.facilityCode ||
                        (fac.id === 'fac_lagos_island_001'
                          ? 'LLSC-VI'
                          : fac.id === 'fac_abuja_national_002'
                          ? 'ACCH-ABJ'
                          : 'PRMC-PHC');
                      return (
                        <button
                          key={fac.id}
                          type="button"
                          onClick={() => {
                            setHospitalCode(code);
                            setSelectedFacilityId(fac.id);
                          }}
                          className={`text-[10px] font-mono px-2 py-1 rounded-md border transition-all cursor-pointer ${
                            hospitalCode === code
                              ? 'bg-[#1769E0]/10 border-[#1769E0] text-[#1769E0] font-bold ring-1 ring-[#1769E0]/20'
                              : 'bg-[#F6F9FC] border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
                          }`}
                        >
                          {code}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Staff Username Field */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="username-input"
                    className="block text-xs font-bold text-[#0B1F33]"
                  >
                    Staff Username
                  </label>
                  <input
                    type="text"
                    id="username-input"
                    inputMode="text"
                    autoCapitalize="none"
                    autoComplete="username"
                    spellCheck={false}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. adaeze.okafor, musa"
                    className="cb-input w-full px-4 py-3 text-sm font-medium rounded-xl"
                    required
                  />
                  <p className="text-[10px] text-[#64748B]">
                    Assigned by your healthcare institution. The same username may exist across different hospitals.
                  </p>
                </div>

                {/* Password Field with Show/Hide Toggle */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password-input"
                      className="block text-xs font-bold text-[#0B1F33]"
                    >
                      Account Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowRecoveryModal(true)}
                      className="text-[11px] text-[#1769E0] hover:underline cursor-pointer font-medium"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your staff password"
                      className="cb-input w-full px-4 py-3 pr-11 text-sm font-medium rounded-xl"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0B1F33] p-1.5 rounded-md transition-colors cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Sign In Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="cb-btn cb-btn-primary cb-btn-shine w-full py-3.5 px-6 text-sm font-semibold rounded-xl gap-2.5 justify-center shadow-sm group cursor-pointer min-h-[44px]"
                  >
                    <KeyRound className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                    <span>
                      {isAuthenticating
                        ? 'Authenticating Hospital Credentials...'
                        : `Sign In to ${hospitalCode || 'Hospital Workspace'}`}
                    </span>
                  </button>
                </div>
              </form>

              {/* Recovery Assistance Dialog Modal */}
              {showRecoveryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-[#E2E8F0] shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[#0B1F33]">
                        <HelpCircle className="w-5 h-5 text-[#1769E0]" />
                        <h3 className="font-display font-bold text-base">
                          Hospital Credential Assistance
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowRecoveryModal(false)}
                        className="text-[#64748B] hover:text-[#0B1F33] p-1 rounded-md"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2.5 text-xs text-[#64748B] leading-relaxed">
                      <p>
                        In accordance with CornerBrief healthcare data governance, staff authentication credentials are institutional and facility-controlled.
                      </p>
                      <div className="p-3 bg-[#F6F9FC] rounded-xl border border-[#E2E8F0] space-y-1.5">
                        <strong className="text-[#0B1F33] block">How to recover or reset your password:</strong>
                        <ul className="list-disc list-inside space-y-1 text-[11px]">
                          <li>Contact your hospital designated <strong>Facility Administrator</strong> or Chief Medical Director.</li>
                          <li>Hospital IT or Records Officers can re-enroll staff credentials in the Facility Management Console.</li>
                          <li>Passwords are securely salted with scrypt and can never be retrieved in plaintext.</li>
                        </ul>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowRecoveryModal(false)}
                        className="cb-btn cb-btn-secondary px-4 py-2 text-xs font-semibold rounded-xl"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Evaluation Quick Access Option */}
              <div className="pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  <span>Institutional Review &amp; Evaluation Access Available</span>
                </div>
                <button
                  type="button"
                  onClick={() => onDemoSignIn('Clinician', selectedFacilityId)}
                  className="text-xs font-semibold text-[#1769E0] hover:underline cursor-pointer group inline-flex items-center gap-1"
                >
                  <span>Quick Workspace Preview (Clinician View)</span>
                  <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
                </button>
              </div>
            </div>

            {/* Facility Registration Callout with Shimmer Button */}
            <div className="bg-[#0B1F33] text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="font-display text-lg font-bold text-white">
                  Register a New Hospital or Clinic
                </h3>
                <p className="text-xs text-slate-300">
                  Provision an isolated multi-tenant workspace for your medical facility in minutes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenRegisterFacility('Hospital')}
                className="cb-btn cb-btn-shine bg-white hover:bg-slate-100 text-[#0B1F33] py-2.5 px-5 text-xs font-bold rounded-xl whitespace-nowrap shadow-sm group"
              >
                <span>Register Your Facility</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================= */}
      {/* 8. GLOBAL HEALTHCARE FOOTER                               */}
      {/* ========================================================= */}
      <footer className="bg-white border-t border-[#E2E8F0] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3">
              <CornerBriefLogo
                size="lg"
              />
              <p className="text-xs text-[#64748B] max-w-md leading-relaxed">
                An international digital workspace for hospitals, clinics, and specialist centres.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-[#64748B]">
              <button
                type="button"
                onClick={() => scrollToSection('hospital-scenes')}
                className="hover:text-[#0B1F33]"
              >
                Hospital Activities
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('care-journey')}
                className="hover:text-[#0B1F33]"
              >
                Care Journey
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('capabilities')}
                className="hover:text-[#0B1F33]"
              >
                Capabilities
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('nonye-ai')}
                className="hover:text-[#0B1F33]"
              >
                NONYE AI
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('security')}
                className="hover:text-[#0B1F33]"
              >
                Security
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('workspace-access')}
                className="hover:text-[#0B1F33]"
              >
                Workspaces
              </button>
              <button
                type="button"
                onClick={() => onOpenRegisterFacility('Hospital')}
                className="hover:text-[#0B1F33] text-[#1769E0] font-semibold"
              >
                Register Facility
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-[#E2E8F0] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#64748B]">
            <p className="text-center md:text-left text-[11px] text-[#64748B] max-w-2xl">
              <strong>Clinical Notice:</strong> CornerBrief is a healthcare information and workflow platform. NONYE AI is a documentation assistant and does not formulate autonomous diagnoses or replace licensed clinical judgment.
            </p>
            <div className="font-mono text-[11px] shrink-0">
              &copy; 2026 CornerBrief. International Healthcare Platform.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
