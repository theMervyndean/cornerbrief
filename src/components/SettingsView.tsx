import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { Facility, FacilityType, UserProfile, UserRole } from '../types';
import { NIGERIA_CLINICAL_DEPARTMENTS, NIGERIAN_STATES } from '../data/seedData';

interface SettingsViewProps {
  currentUser: UserProfile;
  facility: Facility;
  staffDirectory: UserProfile[];
  onUpdateFacility: (
    name: string,
    location: string,
    extra?: {
      facilityType?: FacilityType;
      facilityCode?: string;
      state?: string;
      departments?: string[];
      contactEmail?: string;
      contactPhone?: string;
    }
  ) => Promise<void>;
  onAddStaffMember: (
    name: string,
    email: string,
    role: UserRole,
    department?: string,
    temporaryPassword?: string
  ) => Promise<{
    staff: UserProfile;
    credentials: {
      email: string;
      temporaryPassword: string;
      facilityId: string;
      mustChangePassword: boolean;
    };
  }>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  facility,
  staffDirectory,
  onUpdateFacility,
  onAddStaffMember,
}) => {
  const isAdmin =
    currentUser.role === 'Admin' ||
    currentUser.role === 'FacilityAdmin' ||
    currentUser.role === 'PlatformAdmin';

  const [facilityName, setFacilityName] = useState(facility.name);
  const [facilityLocation, setFacilityLocation] = useState(facility.location);
  const [facilityType, setFacilityType] = useState<FacilityType>(
    facility.facilityType || 'Specialist Clinic'
  );
  const [facilityCode, setFacilityCode] = useState(facility.facilityCode || 'CB-NG');
  const [facilityState, setFacilityState] = useState(facility.state || 'Lagos State');
  const [contactEmail, setContactEmail] = useState(facility.contactEmail || '');
  const [contactPhone, setContactPhone] = useState(facility.contactPhone || '');
  const [departments, setDepartments] = useState<string[]>(
    facility.departments && facility.departments.length > 0
      ? facility.departments
      : [
          'General Outpatient (GOPD)',
          'Cardiology & Hypertension',
          'Maternal & Antenatal Care',
        ]
  );
  const [newDepartmentInput, setNewDepartmentInput] = useState('');

  const [isSavingFacility, setIsSavingFacility] = useState(false);
  const [facilitySaved, setFacilitySaved] = useState(false);

  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Doctor');
  const [newUserDepartment, setNewUserDepartment] = useState<string>(
    departments[0] || 'General Outpatient (GOPD)'
  );
  const [newUserTempPassword, setNewUserTempPassword] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [userAddedMsg, setUserAddedMsg] = useState<string | null>(null);
  const [userAddError, setUserAddError] = useState<string | null>(null);
  const [provisionedInfo, setProvisionedInfo] = useState<{
    staff: UserProfile;
    credentials: {
      email: string;
      temporaryPassword: string;
      facilityId: string;
      mustChangePassword: boolean;
    };
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Sync local form state when active facility switches
  useEffect(() => {
    setFacilityName(facility.name);
    setFacilityLocation(facility.location);
    setFacilityType(facility.facilityType || 'Specialist Clinic');
    setFacilityCode(facility.facilityCode || 'CB-NG');
    setFacilityState(facility.state || 'Lagos State');
    setContactEmail(facility.contactEmail || '');
    setContactPhone(facility.contactPhone || '');
    const depts =
      facility.departments && facility.departments.length > 0
        ? facility.departments
        : [
            'General Outpatient (GOPD)',
            'Cardiology & Hypertension',
            'Maternal & Antenatal Care',
          ];
    setDepartments(depts);
    setNewUserDepartment(depts[0] || 'General Outpatient (GOPD)');
  }, [facility]);

  const handleFacilitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !facilityName.trim() || !facilityLocation.trim()) return;
    setIsSavingFacility(true);
    try {
      await onUpdateFacility(facilityName.trim(), facilityLocation.trim(), {
        facilityType,
        facilityCode: facilityCode.trim() || 'CB-NG',
        state: facilityState,
        departments,
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
      });
      setFacilitySaved(true);
      setTimeout(() => setFacilitySaved(false), 3000);
    } finally {
      setIsSavingFacility(false);
    }
  };

  const handleAddDepartment = () => {
    if (!isAdmin) return;
    const cleaned = newDepartmentInput.trim();
    if (!cleaned || departments.includes(cleaned)) return;
    setDepartments((prev) => [...prev, cleaned]);
    setNewDepartmentInput('');
  };

  const handleRemoveDepartment = (dept: string) => {
    if (!isAdmin || departments.length <= 1) return;
    setDepartments((prev) => prev.filter((d) => d !== dept));
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newUserName.trim() || !newUserEmail.trim()) return;
    setIsAddingUser(true);
    setUserAddError(null);
    setUserAddedMsg(null);
    try {
      const result = await onAddStaffMember(
        newUserName.trim(),
        newUserEmail.trim(),
        newUserRole,
        newUserDepartment,
        newUserTempPassword.trim() || undefined
      );
      setProvisionedInfo(result);
      setUserAddedMsg(
        `Staff account successfully provisioned for ${newUserName.trim()} (${newUserRole} · ${newUserDepartment}).`
      );
      setNewUserName('');
      setNewUserEmail('');
      setNewUserTempPassword('');
    } catch (err: any) {
      setUserAddError(
        err.message || 'Unable to provision staff account. Please verify details.'
      );
    } finally {
      setIsAddingUser(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#1769E0] font-semibold">
              {facility.facilityType || 'Healthcare Facility'} Tenant Configuration
            </span>
            <span className="text-xs text-[#64748B]">·</span>
            <span className="text-[11px] font-mono text-[#64748B]">
              Code: {facility.facilityCode || 'CB-NG'}
            </span>
          </div>
          <h1 className="font-display text-xl font-bold text-[#0B1F33] mt-0.5">
            Facility Profile, Clinical Units &amp; Access Control
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Configure hospital/clinic details, manage clinical service departments, and control role-based user access for{' '}
            <strong className="text-[#0B1F33]">{facility.name}</strong>.
          </p>
        </div>
      </div>

      {/* Authorized Session Credentials & Role Profile (Read-Only RBAC) */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-[#0B1F33] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#1769E0]" />
              <span>Authorized Staff Profile &amp; Role</span>
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Role permissions and facility assignments are securely persisted and managed by authorized hospital administrators.
            </p>
          </div>
          <span className="text-xs font-mono text-[#0E9F9A] font-semibold bg-[#0E9F9A]/10 px-2.5 py-1 rounded-md border border-[#0E9F9A]/20">
            Active Role: {currentUser.role}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
            <span className="text-[11px] text-[#64748B] block font-medium">Staff Member</span>
            <span className="text-sm font-bold text-[#0B1F33]">{currentUser.name}</span>
            <span className="text-xs font-mono text-[#64748B] block mt-0.5">{currentUser.email}</span>
          </div>
          <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
            <span className="text-[11px] text-[#64748B] block font-medium">Assigned Department</span>
            <span className="text-sm font-bold text-[#0B1F33]">{currentUser.department || 'General Outpatient (GOPD)'}</span>
            <span className="text-xs text-[#64748B] block mt-0.5">Clinical Unit</span>
          </div>
          <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
            <span className="text-[11px] text-[#64748B] block font-medium">Assigned Facility</span>
            <span className="text-sm font-bold text-[#0B1F33]">{facility.name}</span>
            <span className="text-xs font-mono text-[#1769E0] block mt-0.5">Code: {facility.facilityCode || facility.id}</span>
          </div>
        </div>
      </div>

      {/* Healthcare Facility Information & Clinical Departments */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-[#0B1F33]" />
            <div>
              <h2 className="font-display text-base font-bold text-[#0B1F33]">
                Healthcare Facility Profile &amp; Clinical Departments
              </h2>
              <p className="text-xs text-[#64748B]">
                Tenant ID: <span className="font-mono">{facility.id}</span>
              </p>
            </div>
          </div>
          {!isAdmin && (
            <span className="inline-flex items-center gap-1 text-xs text-[#64748B]">
              <Lock className="w-3.5 h-3.5" />
              <span>Admin required to edit</span>
            </span>
          )}
        </div>

        <form onSubmit={handleFacilitySubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#17212B] mb-1">
                Official Facility Name
              </label>
              <input
                type="text"
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                disabled={!isAdmin}
                className="cb-input w-full px-3.5 py-2 text-sm rounded-lg disabled:bg-[#F6F9FC] disabled:text-[#64748B]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17212B] mb-1">
                Facility Classification
              </label>
              <select
                value={facilityType}
                onChange={(e) => setFacilityType(e.target.value as FacilityType)}
                disabled={!isAdmin}
                className="cb-input w-full px-3.5 py-2 text-sm rounded-lg disabled:bg-[#F6F9FC] disabled:text-[#64748B]"
              >
                <option value="Hospital">Hospital</option>
                <option value="Specialist Clinic">Specialist Clinic</option>
                <option value="Medical Center">Medical Center</option>
                <option value="Primary Care Clinic">Primary Care Clinic</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#17212B] mb-1">
                Address &amp; Location
              </label>
              <input
                type="text"
                value={facilityLocation}
                onChange={(e) => setFacilityLocation(e.target.value)}
                disabled={!isAdmin}
                className="cb-input w-full px-3.5 py-2 text-sm rounded-lg disabled:bg-[#F6F9FC] disabled:text-[#64748B]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17212B] mb-1">
                Nigerian State
              </label>
              <select
                value={facilityState}
                onChange={(e) => setFacilityState(e.target.value)}
                disabled={!isAdmin}
                className="cb-input w-full px-3.5 py-2 text-sm rounded-lg disabled:bg-[#F6F9FC] disabled:text-[#64748B]"
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
                Patient ID Prefix Code
              </label>
              <input
                type="text"
                value={facilityCode}
                onChange={(e) => setFacilityCode(e.target.value.toUpperCase())}
                disabled={!isAdmin}
                className="cb-input w-full px-3.5 py-2 text-sm font-mono rounded-lg disabled:bg-[#F6F9FC] disabled:text-[#64748B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17212B] mb-1">
                Official Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={!isAdmin}
                placeholder="admin@facility.ng"
                className="cb-input w-full px-3.5 py-2 text-sm rounded-lg disabled:bg-[#F6F9FC] disabled:text-[#64748B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17212B] mb-1">
                Official Contact Phone
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                disabled={!isAdmin}
                placeholder="+234 803 000 0000"
                className="cb-input w-full px-3.5 py-2 text-sm font-mono rounded-lg disabled:bg-[#F6F9FC] disabled:text-[#64748B]"
              />
            </div>
          </div>

          {/* Clinical Departments Management */}
          <div className="pt-3 border-t border-[#E2E8F0] space-y-2.5">
            <label className="block text-xs font-semibold text-[#17212B]">
              Active Clinical Departments &amp; Service Units ({departments.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {departments.map((dept) => (
                <span
                  key={dept}
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#F6F9FC] border border-[#E2E8F0] text-[#0B1F33] px-3 py-1 rounded-lg"
                >
                  <span>{dept}</span>
                  {isAdmin && departments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDepartment(dept)}
                      className="text-[#64748B] hover:text-[#DC2626]"
                      aria-label={`Remove ${dept}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>

            {isAdmin && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <select
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && !departments.includes(val)) {
                      setDepartments((prev) => [...prev, val]);
                    }
                  }}
                  className="cb-input px-3 py-1.5 text-xs rounded-lg"
                >
                  <option value="">+ Quick-add standard department...</option>
                  {NIGERIA_CLINICAL_DEPARTMENTS.filter((d) => !departments.includes(d)).map(
                    (dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    )
                  )}
                </select>

                <div className="flex items-center gap-1.5 flex-1 min-w-[220px]">
                  <input
                    type="text"
                    value={newDepartmentInput}
                    onChange={(e) => setNewDepartmentInput(e.target.value)}
                    placeholder="Or enter custom unit name..."
                    className="cb-input flex-1 px-3 py-1.5 text-xs rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleAddDepartment}
                    className="cb-btn cb-btn-secondary py-1.5 px-3 text-xs font-semibold rounded-lg gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Unit</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="flex items-center justify-between pt-2">
              <AnimatePresence>
                {facilitySaved ? (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs font-medium text-[#16A34A] inline-flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Facility profile &amp; clinical departments updated.</span>
                  </motion.span>
                ) : (
                  <span />
                )}
              </AnimatePresence>
              <button
                type="submit"
                disabled={isSavingFacility}
                className="cb-btn cb-btn-primary py-2 px-4 text-xs font-medium rounded-lg gap-1.5 whitespace-nowrap"
              >
                {isSavingFacility && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isSavingFacility ? 'Saving...' : 'Save Facility Configuration'}</span>
              </button>
            </div>
          )}
        </form>
      </div>

      {/* User Directory & Admin User Management */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-[#1769E0]" />
            <div>
              <h2 className="font-display text-base font-bold text-[#0B1F33]">
                Authorized Facility Team ({staffDirectory.length})
              </h2>
              <p className="text-xs text-[#64748B]">
                Role-based clinician and staff directory scoped to {facility.name}
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-[#E2E8F0]">
          {staffDirectory.map((member) => (
            <div
              key={member.id}
              className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors duration-150 hover:bg-[#F6F9FC]"
            >
              <div>
                <span className="font-semibold text-[#0B1F33] text-sm">{member.name}</span>
                <span className="text-[#64748B] ml-2 font-mono">{member.email}</span>
                {member.department && (
                  <span className="ml-2 text-[11px] bg-[#F6F9FC] border border-[#E2E8F0] px-2 py-0.5 rounded text-[#17212B]">
                    {member.department}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-[#0E9F9A]">{member.role}</span>
                <span className="text-[#64748B] font-mono tabular-nums">
                  Joined {member.createdAt.slice(0, 10)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {isAdmin && (
          <div className="p-6 bg-[#F8FAFC] border-t border-[#E2E8F0] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#0B1F33] flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#1769E0]" />
                  <span>Provision Individual Staff Account for {facility.name}</span>
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Issue individual hospital-managed login credentials with role-specific access permissions.
                </p>
              </div>
            </div>

            <AnimatePresence>
              {userAddError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold">Provisioning Error: </span>
                    <span>{userAddError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUserAddError(null)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {provisionedInfo && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 bg-emerald-50/80 border border-emerald-300 rounded-xl space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-emerald-900">
                          Staff Account Successfully Provisioned
                        </h4>
                        <p className="text-xs text-emerald-800">
                          Secure temporary credentials issued for{' '}
                          <strong>{provisionedInfo.staff.name}</strong> ({provisionedInfo.staff.role} ·{' '}
                          {provisionedInfo.staff.department}).
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProvisionedInfo(null)}
                      className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold px-2 py-1 rounded hover:bg-emerald-100"
                    >
                      Dismiss
                    </button>
                  </div>

                  <div className="bg-white border border-emerald-200 rounded-lg p-3 text-xs space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#0B1F33]">
                      <div>
                        <span className="text-[#64748B] block text-[11px]">Staff Login Email:</span>
                        <span className="font-mono font-medium">{provisionedInfo.credentials.email}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block text-[11px]">Assigned Facility Code:</span>
                        <span className="font-mono font-medium">{facility.facilityCode || facility.id}</span>
                      </div>
                      <div className="sm:col-span-2 flex items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] p-2.5 rounded-lg">
                        <div>
                          <span className="text-[11px] text-[#64748B] block">Temporary Password:</span>
                          <span className="font-mono font-bold text-sm tracking-wider text-[#0B1F33]">
                            {provisionedInfo.credentials.temporaryPassword}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const credText = `CornerBrief Staff Credentials\nFacility: ${facility.name} (${facility.id})\nStaff Member: ${provisionedInfo.staff.name} (${provisionedInfo.staff.role})\nLogin Email: ${provisionedInfo.credentials.email}\nTemporary Password: ${provisionedInfo.credentials.temporaryPassword}\nNote: Change password upon initial sign-in.`;
                            navigator.clipboard.writeText(credText);
                            setCopiedKey(true);
                            setTimeout(() => setCopiedKey(false), 2500);
                          }}
                          className="cb-btn cb-btn-secondary px-3 py-1.5 text-xs font-medium rounded-lg gap-1.5"
                        >
                          {copiedKey ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-[#64748B]" />
                          )}
                          <span>{copiedKey ? 'Copied!' : 'Copy Credentials'}</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#64748B] italic">
                      Provide these temporary credentials to the staff member. They will sign in using their email and temporary password.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleAddUserSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-[#17212B] mb-1">
                    Full Name &amp; Title
                  </label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="e.g. Dr. Ngozi Eze"
                    className="cb-input w-full px-3 py-2 text-xs rounded-lg"
                    required
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-[#17212B] mb-1">
                    Staff Email Address
                  </label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="e.g. n.eze@hospital.ng"
                    className="cb-input w-full px-3 py-2 text-xs rounded-lg"
                    required
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-[#17212B] mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="cb-input w-full px-2.5 py-2 text-xs rounded-lg font-medium text-[#0B1F33]"
                  >
                    <option value="Doctor">Doctor (Clinical &amp; Attending)</option>
                    <option value="Nurse">Nurse (Clinical Ward / Triage)</option>
                    <option value="FacilityAdmin">Facility Administrator</option>
                    <option value="RecordsStaff">Medical Records / Intake Staff</option>
                    <option value="HR">Human Resources &amp; Staff</option>
                    <option value="Clinician">Clinician (General)</option>
                    <option value="Staff">Staff (General Intake)</option>
                    <option value="Admin">Admin (Full Facility Control)</option>
                  </select>
                </div>

                <div className="sm:col-span-6">
                  <label className="block text-[11px] font-semibold text-[#17212B] mb-1">
                    Clinical Department / Service Unit
                  </label>
                  <select
                    value={newUserDepartment}
                    onChange={(e) => setNewUserDepartment(e.target.value)}
                    className="cb-input w-full px-3 py-2 text-xs rounded-lg"
                  >
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                    <option value="Hospital Administration">Hospital Administration</option>
                    <option value="Medical Records">Medical Records</option>
                    <option value="Nursing Services">Nursing Services</option>
                  </select>
                </div>

                <div className="sm:col-span-6">
                  <label className="block text-[11px] font-semibold text-[#17212B] mb-1">
                    Temporary Password (Optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newUserTempPassword}
                      onChange={(e) => setNewUserTempPassword(e.target.value)}
                      placeholder="Leave blank to auto-generate"
                      className="cb-input flex-1 px-3 py-2 text-xs rounded-lg font-mono"
                      minLength={8}
                    />
                    <button
                      type="submit"
                      disabled={isAddingUser}
                      className="cb-btn cb-btn-primary py-2 px-4 text-xs font-medium rounded-lg gap-1.5 whitespace-nowrap"
                    >
                      {isAddingUser ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>{isAddingUser ? 'Provisioning...' : 'Provision Staff Account'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* NONYE AI Safety Rules Governance Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-[#0E9F9A]" />
          <h2 className="font-display text-base font-bold text-[#0B1F33]">
            NONYE AI Clinical Safety &amp; Privacy Guardrails
          </h2>
        </div>
        <p className="text-xs text-[#64748B] leading-relaxed">
          NONYE AI operates strictly as a clinical documentation and information-organization assistant inside CornerBrief. The following non-negotiable rules are enforced across every encounter:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-[#17212B] pt-1">
          {[
            'Never invents patient information, symptoms, or lab results',
            'Never diagnoses patients or claims unstated diseases',
            'Never prescribes medication or recommends dosages',
            'Never makes autonomous treatment decisions',
            'Always preserves original clinician-entered encounter notes',
            'Explicitly flags missing information as "Not provided."',
            'Requires human clinician review and edit access before saving',
            'Locks finalized clinical records against silent overwriting',
          ].map((rule, i) => (
            <div key={i} className="flex items-start gap-2">
              <UserCheck className="w-3.5 h-3.5 text-[#0E9F9A] shrink-0 mt-0.5" />
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
