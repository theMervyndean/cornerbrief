import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FilePlus,
  FileText,
  Filter,
  Plus,
  Sparkles,
  Stethoscope,
  Users,
} from 'lucide-react';
import { Encounter, Facility, Patient, UserProfile } from '../types';
import { calculateAge, getTodayDateString, maskPhoneNumber } from '../data/seedData';
import { EncounterStatusBadge, PatientStatusBadge } from './StatusBadge';
import { DashboardSkeleton } from './SkeletonLoader';

interface DashboardViewProps {
  currentUser: UserProfile;
  facility?: Facility;
  patients: Patient[];
  encounters: Encounter[];
  isLoading?: boolean;
  onNewPatient: () => void;
  onNewEncounter: (patientId?: string, department?: string) => void;
  onOpenPatient: (patientId: string) => void;
  onOpenEncounter: (encounterId: string) => void;
  onNavigatePatients: () => void;
  onNavigateEncounters: () => void;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  facility,
  patients,
  encounters,
  isLoading = false,
  onNewPatient,
  onNewEncounter,
  onOpenPatient,
  onOpenEncounter,
  onNavigatePatients,
  onNavigateEncounters,
}) => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [taskFilter, setTaskFilter] = useState<'ALL_PENDING' | 'NEEDS_AI_REVIEW' | 'DRAFTS'>(
    'ALL_PENDING'
  );

  const todayStr = getTodayDateString();
  const canCreateEncounter =
    currentUser.role === 'Clinician' || currentUser.role === 'Admin';

  const getEncounterDepartment = (enc: Encounter): string =>
    enc.department || 'General Outpatient (GOPD)';

  // Build complete list of departments for this facility
  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    if (facility?.departments) {
      facility.departments.forEach((d) => {
        if (d) set.add(d);
      });
    }
    if (currentUser.department && currentUser.department !== 'Hospital Administration') {
      set.add(currentUser.department);
    }
    encounters.forEach((e) => {
      set.add(getEncounterDepartment(e));
    });
    if (set.size === 0) {
      set.add('General Outpatient (GOPD)');
    }
    return Array.from(set);
  }, [facility, currentUser.department, encounters]);

  // Filter encounters by selected department
  const scopedEncounters = useMemo(() => {
    if (selectedDepartment === 'ALL') return encounters;
    return encounters.filter(
      (enc) => getEncounterDepartment(enc) === selectedDepartment
    );
  }, [encounters, selectedDepartment]);

  // Filter patients: when a department is active, show patients who have encounters in that department
  const scopedPatients = useMemo(() => {
    if (selectedDepartment === 'ALL') return patients;
    const patientIdsInDept = new Set(scopedEncounters.map((e) => e.patientId));
    return patients.filter((p) => patientIdsInDept.has(p.id));
  }, [patients, scopedEncounters, selectedDepartment]);

  // Pending tasks (unfinalized encounters) in the active department view
  const pendingTasks = useMemo(() => {
    const unfinalized = scopedEncounters.filter((e) => e.status !== 'Finalized');
    if (taskFilter === 'NEEDS_AI_REVIEW') {
      return unfinalized.filter(
        (e) => e.status === 'Pending Review' || e.status === 'AI Generated' || e.status === 'Reviewed'
      );
    }
    if (taskFilter === 'DRAFTS') {
      return unfinalized.filter((e) => e.status === 'Draft');
    }
    return unfinalized;
  }, [scopedEncounters, taskFilter]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const totalPatientsCount =
    selectedDepartment === 'ALL' ? patients.length : scopedPatients.length;
  const todaysEncountersCount = scopedEncounters.filter(
    (e) => e.encounterDate === todayStr
  ).length;
  const pendingDocumentationCount = scopedEncounters.filter(
    (e) => e.status !== 'Finalized'
  ).length;
  const completedDocumentationCount = scopedEncounters.filter(
    (e) => e.status === 'Finalized'
  ).length;

  const recentPatients = [...(selectedDepartment === 'ALL' ? patients : scopedPatients)]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentEncounters = [...scopedEncounters]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const getPatientById = (id: string) => patients.find((p) => p.id === id);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const clinicianHomeDept =
    currentUser.department &&
    availableDepartments.includes(currentUser.department)
      ? currentUser.department
      : availableDepartments[0];

  const isMyDeptActive =
    Boolean(clinicianHomeDept) && selectedDepartment === clinicianHomeDept;

  const metricCards = [
    {
      label:
        selectedDepartment === 'ALL' ? 'Total Patients' : 'Department Patients',
      value: totalPatientsCount,
      subtext:
        selectedDepartment === 'ALL'
          ? 'Registered facility records'
          : `Active in ${selectedDepartment}`,
      Icon: Users,
      iconColor: 'text-[#1769E0]',
      monoSubtext: false,
    },
    {
      label: "Today's Encounters",
      value: todaysEncountersCount,
      subtext: `Date: ${todayStr}`,
      Icon: Calendar,
      iconColor: 'text-[#0E9F9A]',
      monoSubtext: true,
    },
    {
      label: 'Pending Tasks & Review',
      value: pendingDocumentationCount,
      subtext:
        selectedDepartment === 'ALL'
          ? 'Awaiting clinician review or finalization'
          : `Unfinalized in ${selectedDepartment}`,
      Icon: Clock,
      iconColor: 'text-[#D97706]',
      monoSubtext: false,
    },
    {
      label: 'Completed Documentation',
      value: completedDocumentationCount,
      subtext: 'Reviewed & finalized clinical records',
      Icon: CheckCircle2,
      iconColor: 'text-[#16A34A]',
      monoSubtext: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header & Primary Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-[#E2E8F0] rounded-xl p-6"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#1769E0] font-semibold">
              {facility?.name || 'CornerBrief Clinical Workspace'}
            </span>
            {currentUser.department && (
              <>
                <span className="text-xs text-[#64748B]">·</span>
                <span className="text-[11px] font-mono text-[#0E9F9A] font-semibold">
                  Unit: {currentUser.department}
                </span>
              </>
            )}
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-[#0B1F33]">
            {greeting}, {currentUser.name}
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            {selectedDepartment === 'ALL'
              ? 'Viewing facility-wide clinical activity and documentation tasks.'
              : `Scoped to ${selectedDepartment} — showing departmental encounters and pending clinician tasks.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onNewPatient}
            className="cb-btn cb-btn-secondary py-2 px-4 text-xs font-medium rounded-lg gap-2 whitespace-nowrap group"
          >
            <Plus className="w-4 h-4 text-[#1769E0] transition-transform duration-200 group-hover:rotate-90" />
            <span>+ New Patient</span>
          </button>

          {canCreateEncounter && (
            <button
              type="button"
              onClick={() =>
                onNewEncounter(
                  undefined,
                  selectedDepartment !== 'ALL' ? selectedDepartment : clinicianHomeDept
                )
              }
              className="cb-btn cb-btn-primary cb-btn-shine py-2 px-4 text-xs font-medium rounded-lg gap-2 whitespace-nowrap group"
            >
              <FilePlus className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
              <span>
                {selectedDepartment !== 'ALL'
                  ? `+ New ${selectedDepartment.split(' ')[0]} Encounter`
                  : '+ New Encounter'}
              </span>
            </button>
          )}
        </div>
      </motion.div>

      {/* DEPARTMENT VIEW FILTER BAR */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.03, ease: EASE_OUT_EXPO }}
        className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 space-y-3.5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0B1F33] text-white flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-[#0E9F9A]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm font-bold text-[#0B1F33]">
                  Department View
                </h2>
                <span className="text-[11px] font-mono text-[#64748B]">
                  ({availableDepartments.length} Clinical Units)
                </span>
              </div>
              <p className="text-xs text-[#64748B]">
                Filter recent encounters, pending NONYE AI reviews, and clinical tasks by hospital department.
              </p>
            </div>
          </div>

          {/* Quick Clinician Unit Toggle & Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            {clinicianHomeDept && (
              <button
                type="button"
                onClick={() =>
                  setSelectedDepartment(isMyDeptActive ? 'ALL' : clinicianHomeDept)
                }
                className={`cb-btn py-1.5 px-3 text-xs font-semibold rounded-lg gap-1.5 border ${
                  isMyDeptActive
                    ? 'bg-[#0E9F9A] text-white border-[#0E9F9A]'
                    : 'bg-[#F6F9FC] text-[#0B1F33] border-[#E2E8F0] hover:border-[#0E9F9A]/50'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>My Department ({clinicianHomeDept.split(' ')[0]})</span>
              </button>
            )}

            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#64748B] hidden sm:inline" />
              <select
                aria-label="Select clinical department view"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="cb-input px-3 py-1.5 text-xs font-medium rounded-lg"
              >
                <option value="ALL">All Departments ({encounters.length} Encounters)</option>
                {availableDepartments.map((dept) => {
                  const deptCount = encounters.filter(
                    (e) => getEncounterDepartment(e) === dept
                  ).length;
                  return (
                    <option key={dept} value={dept}>
                      {dept} ({deptCount})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Interactive Department Segmented Bar */}
        <div
          className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-[#E2E8F0]"
          role="tablist"
          aria-label="Hospital departments"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedDepartment === 'ALL'}
            onClick={() => setSelectedDepartment('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-2 cursor-pointer ${
              selectedDepartment === 'ALL'
                ? 'bg-[#0B1F33] text-white shadow-2xs'
                : 'bg-[#F6F9FC] text-[#64748B] hover:text-[#0B1F33] hover:bg-[#E2E8F0]/50'
            }`}
          >
            <span>All Departments</span>
            <span
              className={`font-mono text-[11px] px-1.5 py-0.2 rounded ${
                selectedDepartment === 'ALL'
                  ? 'bg-white/20 text-white'
                  : 'bg-white text-[#0B1F33]'
              }`}
            >
              {encounters.length}
            </span>
          </button>

          {availableDepartments.map((dept) => {
            const isSelected = selectedDepartment === dept;
            const deptEncounters = encounters.filter(
              (e) => getEncounterDepartment(e) === dept
            );
            const deptPendingCount = deptEncounters.filter(
              (e) => e.status !== 'Finalized'
            ).length;

            return (
              <button
                key={dept}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedDepartment(dept)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 flex items-center gap-2 cursor-pointer border ${
                  isSelected
                    ? 'bg-[#1769E0] text-white border-[#1769E0] font-semibold shadow-2xs'
                    : 'bg-white text-[#17212B] border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F6F9FC]'
                }`}
              >
                <span>{dept}</span>
                <span
                  className={`font-mono text-[11px] px-1.5 py-0.2 rounded ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-[#F6F9FC] text-[#64748B]'
                  }`}
                >
                  {deptEncounters.length}
                </span>
                {deptPendingCount > 0 && (
                  <span
                    title={`${deptPendingCount} pending documentation task(s)`}
                    className={`w-2 h-2 rounded-full ${
                      isSelected ? 'bg-amber-300' : 'bg-[#D97706]'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Live Clinical Metrics Grid (Scoped to Active Department View) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, index) => {
          const Icon = card.Icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: index * 0.04,
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
                className={`mt-1 text-xs text-[#64748B] truncate ${
                  card.monoSubtext ? 'font-mono tabular-nums' : ''
                }`}
              >
                {card.subtext}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* DEPARTMENT PENDING CLINICAL TASKS & DOCUMENTATION QUEUE */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, delay: 0.08, ease: EASE_OUT_EXPO }}
        className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#FAFBFD] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ClipboardCheck className="w-4 h-4 text-[#D97706] shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-[#0B1F33]">
                  Pending Departmental Tasks &amp; Clinician Sign-Off Queue
                </h2>
                <span className="font-mono text-xs font-bold text-[#D97706] bg-[#D97706]/10 px-2 py-0.5 rounded">
                  {pendingTasks.length} Pending
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                {selectedDepartment === 'ALL'
                  ? 'Encounters across all departments requiring NONYE AI generation, clinician review, or final record lock.'
                  : `Actionable clinical documentation tasks in ${selectedDepartment}.`}
              </p>
            </div>
          </div>

          {/* Task Type Sub-Filter */}
          <div className="flex items-center gap-1.5 bg-[#F6F9FC] p-1 rounded-lg border border-[#E2E8F0] self-start sm:self-auto">
            {(
              [
                { id: 'ALL_PENDING', label: 'All Tasks' },
                { id: 'NEEDS_AI_REVIEW', label: 'Awaiting Review' },
                { id: 'DRAFTS', label: 'Unstructured Drafts' },
              ] as const
            ).map((tab) => {
              const active = taskFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTaskFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-white text-[#0B1F33] shadow-2xs'
                      : 'text-[#64748B] hover:text-[#0B1F33]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {pendingTasks.length === 0 ? (
            <motion.div
              key="no-pending-tasks"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 text-center flex flex-col sm:flex-row items-center justify-between gap-4 bg-white"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-lg bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-[#0B1F33]">
                    All clinical documentation tasks are up to date
                    {selectedDepartment !== 'ALL' ? ` in ${selectedDepartment}` : ''}.
                  </p>
                  <p className="text-xs text-[#64748B]">
                    Every recorded encounter in this view has been reviewed and finalized, or no pending tasks match the current filter.
                  </p>
                </div>
              </div>

              {selectedDepartment !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedDepartment('ALL')}
                  className="cb-btn cb-btn-secondary py-1.5 px-3 text-xs font-semibold rounded-lg shrink-0"
                >
                  View All Departments
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={`tasks-${selectedDepartment}-${taskFilter}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="divide-y divide-[#E2E8F0]"
            >
              {pendingTasks.map((taskEnc) => {
                const pat = getPatientById(taskEnc.patientId);
                const dept = getEncounterDepartment(taskEnc);
                const isDraft = taskEnc.status === 'Draft';
                const isReviewed = taskEnc.status === 'Reviewed';

                return (
                  <div
                    key={taskEnc.id}
                    className="px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F6F9FC] transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-mono font-semibold text-[#1769E0] bg-[#1769E0]/10 px-2 py-0.5 rounded">
                          {dept}
                        </span>
                        <span className="text-sm font-bold text-[#0B1F33]">
                          {pat ? `${pat.firstName} ${pat.lastName}` : 'Patient'}
                        </span>
                        {pat && (
                          <span className="text-xs font-mono text-[#64748B]">
                            ({pat.patientId})
                          </span>
                        )}
                        <span className="text-xs text-[#64748B]">·</span>
                        <span className="text-xs font-medium text-[#17212B]">
                          {taskEnc.encounterType}
                        </span>
                      </div>

                      <p className="text-xs text-[#64748B] truncate">
                        <strong className="text-[#17212B] font-medium">Task:</strong>{' '}
                        {isDraft
                          ? 'Unstructured clinical notes recorded — awaiting NONYE AI organization'
                          : isReviewed
                          ? 'Reviewed draft saved — awaiting final clinician lock'
                          : 'NONYE AI structured documentation generated — awaiting clinician verification & sign-off'}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#64748B]">
                        <span>Date: {taskEnc.encounterDate}</span>
                        <span>·</span>
                        <span>Attending: {taskEnc.clinicianName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <EncounterStatusBadge status={taskEnc.status} />
                      <button
                        type="button"
                        onClick={() =>
                          canCreateEncounter
                            ? onOpenEncounter(taskEnc.id)
                            : pat && onOpenPatient(pat.id)
                        }
                        className={`cb-btn py-1.5 px-3.5 text-xs font-semibold rounded-lg gap-1.5 whitespace-nowrap ${
                          isDraft ? 'cb-btn-teal' : 'cb-btn-primary'
                        }`}
                      >
                        {isDraft ? (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Structure with NONYE AI</span>
                          </>
                        ) : (
                          <>
                            <span>{isReviewed ? 'Finalize Record' : 'Review & Attest'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Recent Patients & Recent Encounters (Scoped to Active Department View) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Patients */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.36, delay: 0.06, ease: EASE_OUT_EXPO }}
          className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden flex flex-col"
        >
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-[#0B1F33]">
                {selectedDepartment === 'ALL'
                  ? 'Recent Patients'
                  : `${selectedDepartment} Patients`}
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                {selectedDepartment === 'ALL'
                  ? 'Privacy-conscious registry overview'
                  : 'Patients with encounters recorded in this department'}
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigatePatients}
              className="cb-link text-xs font-medium gap-1 whitespace-nowrap group"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>

          {recentPatients.length === 0 ? (
            <div className="p-8 text-center flex-1 flex flex-col items-center justify-center">
              <Users className="w-8 h-8 text-[#64748B] mb-2" />
              <p className="text-sm font-medium text-[#0B1F33]">
                {selectedDepartment === 'ALL'
                  ? 'No patients registered yet'
                  : `No patient encounters in ${selectedDepartment} yet`}
              </p>
              <p className="text-xs text-[#64748B] mt-1 max-w-xs">
                {selectedDepartment === 'ALL'
                  ? 'Register your first synthetic patient record to begin recording clinical encounters.'
                  : 'Record a new clinical encounter in this department or switch back to All Departments.'}
              </p>
              <div className="flex items-center gap-2 mt-4">
                {selectedDepartment !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setSelectedDepartment('ALL')}
                    className="cb-btn cb-btn-secondary py-2 px-3.5 text-xs font-medium rounded-lg"
                  >
                    Show All Departments
                  </button>
                )}
                <button
                  type="button"
                  onClick={onNewPatient}
                  className="cb-btn cb-btn-primary py-2 px-4 text-xs font-medium rounded-lg whitespace-nowrap"
                >
                  + New Patient
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {recentPatients.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => onOpenPatient(patient.id)}
                  className="cb-table-row w-full text-left px-6 py-3.5 flex items-center justify-between gap-4 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#0B1F33] group-hover:text-[#1769E0] transition-colors duration-150 truncate">
                        {patient.firstName} {patient.lastName}
                      </span>
                      <span className="text-xs text-[#64748B] font-mono tabular-nums">
                        · {patient.patientId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#64748B] mt-1 font-mono tabular-nums">
                      <span>{calculateAge(patient.dateOfBirth)} yrs</span>
                      <span>·</span>
                      <span>{patient.sex}</span>
                      <span>·</span>
                      <span>{maskPhoneNumber(patient.phone)}</span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <PatientStatusBadge status={patient.status} />
                    <ArrowRight className="w-3.5 h-3.5 text-[#64748B] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-[#1769E0] transition-all duration-200" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent Encounters */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.36, delay: 0.12, ease: EASE_OUT_EXPO }}
          className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden flex flex-col"
        >
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-[#0B1F33]">
                {selectedDepartment === 'ALL'
                  ? 'Recent Encounters'
                  : `${selectedDepartment} Encounters`}
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Clinical consultations &amp; NONYE AI status
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateEncounters}
              className="cb-link text-xs font-medium gap-1 whitespace-nowrap group"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>

          {recentEncounters.length === 0 ? (
            <div className="p-8 text-center flex-1 flex flex-col items-center justify-center">
              <FileText className="w-8 h-8 text-[#64748B] mb-2" />
              <p className="text-sm font-medium text-[#0B1F33]">
                {selectedDepartment === 'ALL'
                  ? 'No clinical encounters recorded'
                  : `No encounters recorded in ${selectedDepartment}`}
              </p>
              <p className="text-xs text-[#64748B] mt-1 max-w-xs">
                Create an encounter in this department to organize unstructured notes with NONYE AI.
              </p>
              {canCreateEncounter && (
                <button
                  type="button"
                  onClick={() =>
                    onNewEncounter(
                      undefined,
                      selectedDepartment !== 'ALL' ? selectedDepartment : clinicianHomeDept
                    )
                  }
                  className="cb-btn cb-btn-primary mt-4 py-2 px-4 text-xs font-medium rounded-lg whitespace-nowrap"
                >
                  + New Encounter
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {recentEncounters.map((enc) => {
                const pat = getPatientById(enc.patientId);
                const dept = getEncounterDepartment(enc);
                return (
                  <button
                    key={enc.id}
                    type="button"
                    onClick={() =>
                      canCreateEncounter
                        ? onOpenEncounter(enc.id)
                        : pat && onOpenPatient(pat.id)
                    }
                    className="cb-table-row w-full text-left px-6 py-3.5 flex items-center justify-between gap-4 group"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[#0B1F33] group-hover:text-[#1769E0] transition-colors duration-150 truncate">
                          {pat ? `${pat.firstName} ${pat.lastName}` : 'Unknown Patient'}
                        </span>
                        <span className="text-xs text-[#64748B]">
                          · {enc.encounterType}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] mt-0.5 truncate">
                        {enc.reasonForVisit || 'No reason specified'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#64748B] mt-1 font-mono tabular-nums">
                        <span className="text-[#1769E0] font-semibold">{dept}</span>
                        <span>·</span>
                        <span>{enc.encounterDate}</span>
                        <span>·</span>
                        <span>{enc.clinicianName}</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <EncounterStatusBadge status={enc.status} />
                      <ArrowRight className="w-3.5 h-3.5 text-[#64748B] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-[#1769E0] transition-all duration-200" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* NONYE AI Quick Callout Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
        className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-[#0E9F9A]/10 text-[#0E9F9A] flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#0B1F33]">NONYE AI</span>
              <span className="text-xs text-[#0E9F9A] font-medium">
                · Documentation Assistant
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl">
              Structures unstructured consultation notes into Presenting Concern, Relevant History, Medications, Allergies, Investigations, Clinical Notes, Follow-Up Items, and Missing Information. Strictly requires clinician review before finalization.
            </p>
          </div>
        </div>
        {canCreateEncounter && (
          <button
            type="button"
            onClick={() =>
              onNewEncounter(
                undefined,
                selectedDepartment !== 'ALL' ? selectedDepartment : clinicianHomeDept
              )
            }
            className="cb-btn cb-btn-teal py-2 px-4 text-xs font-medium rounded-lg gap-2 whitespace-nowrap shrink-0 group"
          >
            <Sparkles className="w-3.5 h-3.5 transition-transform duration-200 group-hover:rotate-12" />
            <span>Start AI Documentation</span>
          </button>
        )}
      </motion.div>
    </div>
  );
};
