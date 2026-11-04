export type UserRole =
  | 'Admin'
  | 'Clinician'
  | 'Staff'
  | 'PlatformAdmin'
  | 'FacilityAdmin'
  | 'Doctor'
  | 'Nurse'
  | 'HR'
  | 'RecordsStaff';

export type FacilityType =
  | 'Hospital'
  | 'Specialist Clinic'
  | 'Medical Center'
  | 'Primary Care Clinic';

export type FacilityStatus =
  | 'Pending'
  | 'Onboarding'
  | 'Active'
  | 'Rejected'
  | 'Suspended';

export type PatientStatus = 'Active' | 'Follow-Up' | 'Discharged';

export type EncounterStatus =
  | 'Draft'
  | 'AI Generated'
  | 'Pending Review'
  | 'Reviewed'
  | 'Finalized';

export type AppView =
  | 'dashboard'
  | 'patients'
  | 'patient-profile'
  | 'encounters'
  | 'new-encounter'
  | 'ai-documentation'
  | 'reports'
  | 'settings'
  | 'platform-admin';

export interface Facility {
  id: string;
  ownerId: string;
  name: string;
  location: string;
  facilityType?: FacilityType;
  facilityCode?: string;
  state?: string;
  status?: FacilityStatus;
  departments?: string[];
  contactEmail?: string;
  contactPhone?: string;
  adminName?: string;
  adminEmail?: string;
  adminRoleTitle?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  ownerId: string;
  name: string;
  email: string;
  role: UserRole;
  facilityId: string;
  department?: string;
  createdAt: string;
}

export interface Patient {
  id: string;
  ownerId: string;
  patientId: string;
  facilityId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: 'Female' | 'Male' | 'Other';
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  status: PatientStatus;
  notes: string;
  createdAt: string;
  assignedStaffUids?: string[];
  assignedDoctorUid?: string;
  assignedNurseUid?: string;
}

export interface VitalSigns {
  bloodPressureSystolic?: string;
  bloodPressureDiastolic?: string;
  pulseRate?: string;
  temperatureCelsius?: string;
  respiratoryRate?: string;
  spo2Percent?: string;
  spO2?: string;
  weightKg?: string;
  pcvPercent?: string;
  bloodGlucose?: string;
  recordedBy?: string;
  recordedAt?: string;
}

export interface ClinicalAddendum {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  note: string;
  createdAt: string;
}

export interface OriginalEncounterInput {
  reasonForVisit: string;
  patientReportedInfo: string;
  relevantHistory: string;
  currentMedications: string;
  allergies: string;
  investigations: string;
  clinicianObservations: string;
  additionalNotes: string;
}

export interface StructuredAiDocumentation {
  encounterSummary: string;
  presentingConcern: string;
  relevantHistory: string[];
  medications: string[];
  allergies: string[];
  investigations: string[];
  clinicalNotes: string[];
  followUpItems: string[];
  missingInformation: string[];
  requiresReview: boolean;
}

export interface Encounter {
  id: string;
  ownerId: string;
  patientId: string;
  facilityId: string;
  clinicianId: string;
  clinicianName: string;
  department?: string;
  encounterDate: string;
  encounterType: string;
  reasonForVisit: string;
  vitalSigns?: VitalSigns | null;
  originalInput: OriginalEncounterInput;
  aiDocumentation?: StructuredAiDocumentation | null;
  reviewedDocumentation?: StructuredAiDocumentation | null;
  reviewedBy?: string;
  reviewedAt?: string;
  addenda?: ClinicalAddendum[];
  status: EncounterStatus;
  createdAt: string;
  updatedAt: string;
  attendingStaffUids?: string[];
}

export interface AuditLog {
  id: string;
  ownerId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  facilityId: string;
  action: string;
  patientId: string;
  encounterId: string;
  timestamp: string;
}

export type MembershipStatus = 'Invited' | 'Active' | 'Suspended' | 'Revoked';

export interface FacilityMembership {
  membershipId: string;
  userId: string;
  facilityId: string;
  facilityCode: string;
  username: string;
  normalizedUsername: string;
  role: UserRole;
  departmentId: string;
  status: MembershipStatus;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  // Optional legacy and presentation fields for seamless backward compatibility
  displayName?: string;
  email?: string;
}

export interface PatientAssignment {
  id: string;
  facilityId: string;
  patientId: string;
  assignedStaffUid: string;
  assignedByUid: string;
  assignmentRole: 'Doctor' | 'Nurse' | 'CareTeam';
  status: 'Active' | 'Revoked';
  createdAt: string;
  updatedAt?: string;
}
