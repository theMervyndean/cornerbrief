import {
  FacilityMembership,
  MembershipStatus,
  UserProfile,
  UserRole,
} from '../types';

/**
 * Standardized Role-to-Permissions Mapping for CornerBrief Multi-Facility RBAC
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  PlatformAdmin: [
    'platform:manage',
    'facility:approve',
    'facility:suspend',
    'audit:read_global',
  ],
  FacilityAdmin: [
    'facility:manage',
    'staff:manage',
    'patient:create',
    'patient:read',
    'patient:update',
    'encounter:create',
    'encounter:read',
    'encounter:update',
    'reports:read',
    'audit:read_facility',
  ],
  Doctor: [
    'patient:create',
    'patient:read',
    'patient:update',
    'encounter:create',
    'encounter:read',
    'encounter:update',
    'ai:generate',
    'reports:read',
  ],
  Nurse: [
    'patient:create',
    'patient:read',
    'patient:update',
    'encounter:create',
    'encounter:read',
    'vitals:record',
    'reports:read',
  ],
  HR: ['staff:read', 'staff:manage', 'reports:read'],
  RecordsStaff: [
    'patient:create',
    'patient:read',
    'patient:update',
    'records:manage',
  ],
  // Legacy Role Compatibility
  Admin: [
    'facility:manage',
    'staff:manage',
    'patient:create',
    'patient:read',
    'patient:update',
    'encounter:create',
    'encounter:read',
    'encounter:update',
    'reports:read',
  ],
  Clinician: [
    'patient:create',
    'patient:read',
    'patient:update',
    'encounter:create',
    'encounter:read',
    'encounter:update',
    'ai:generate',
    'reports:read',
  ],
  Staff: ['patient:read', 'encounter:read'],
};

/**
 * Normalizes username to lowercase, trimmed string.
 */
export function normalizeUsername(username: string): string {
  if (!username || typeof username !== 'string') return '';
  return username.trim().toLowerCase();
}

/**
 * Validates username syntax (alphanumeric, dots, hyphens, underscores; 3 to 30 chars).
 */
export function validateUsername(username: string): {
  valid: boolean;
  error?: string;
} {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required.' };
  }
  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 30) {
    return {
      valid: false,
      error: 'Username must be between 3 and 30 characters.',
    };
  }
  const USERNAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/;
  if (trimmed.length === 1 || !USERNAME_REGEX.test(trimmed)) {
    return {
      valid: false,
      error:
        'Username may contain only letters, numbers, dots, hyphens, and underscores, and must start and end with an alphanumeric character.',
    };
  }
  return { valid: true };
}

/**
 * Deterministic Composite Document ID for Facility Membership
 * Guaranteeing username uniqueness per facility at document key level.
 */
export function generateMembershipId(
  facilityId: string,
  normalizedUsername: string
): string {
  const cleanFac = facilityId.replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanUser = normalizedUsername.replace(/[^a-zA-Z0-9_-]/g, '');
  return `mem_${cleanFac}_${cleanUser}`;
}

/**
 * Resolves default permissions for a role, optionally merging custom permissions.
 */
export function resolveAuthorizedPermissions(
  role: UserRole,
  customPermissions?: string[]
): string[] {
  const defaults = DEFAULT_ROLE_PERMISSIONS[role] || [
    'patient:read',
    'encounter:read',
  ];
  if (!Array.isArray(customPermissions) || customPermissions.length === 0) {
    return [...defaults];
  }
  const merged = new Set([...defaults, ...customPermissions]);
  return Array.from(merged);
}

/**
 * Verifies active facility operational status.
 */
export function checkFacilityStatus(facility: {
  id?: string;
  status?: string;
} | null | undefined): {
  active: boolean;
  error?: string;
  code?: string;
} {
  if (!facility) {
    return {
      active: false,
      error: 'Healthcare facility could not be found.',
      code: 'FACILITY_NOT_FOUND',
    };
  }
  const status = facility.status || 'Active';
  if (status !== 'Active') {
    return {
      active: false,
      error: `Healthcare facility is not active (Current status: ${status}). Workspace access is restricted.`,
      code: 'FACILITY_NOT_ACTIVE',
    };
  }
  return { active: true };
}

/**
 * Verifies membership status.
 */
export function checkMembershipStatus(status: MembershipStatus): {
  active: boolean;
  error?: string;
  code?: string;
} {
  switch (status) {
    case 'Active':
      return { active: true };
    case 'Suspended':
      return {
        active: false,
        error:
          'Your membership for this healthcare facility has been suspended by an administrator.',
        code: 'MEMBERSHIP_SUSPENDED',
      };
    case 'Revoked':
      return {
        active: false,
        error:
          'Your membership for this healthcare facility has been revoked.',
        code: 'MEMBERSHIP_REVOKED',
      };
    case 'Invited':
      return {
        active: false,
        error:
          'Your membership invitation has not yet been accepted and activated.',
        code: 'MEMBERSHIP_INVITED',
      };
    default:
      return {
        active: false,
        error: 'Invalid membership status.',
        code: 'MEMBERSHIP_INVALID',
      };
  }
}

/**
 * Comprehensive verification of user's active facility membership.
 * Never trusts client-supplied facilityId or role alone.
 */
export function verifyActiveFacilityMembership(
  membership: FacilityMembership | null | undefined,
  facility: { id?: string; status?: string } | null | undefined
): {
  authorized: boolean;
  error?: string;
  code?: string;
  role?: UserRole;
  permissions?: string[];
} {
  const facCheck = checkFacilityStatus(facility);
  if (!facCheck.active) {
    return {
      authorized: false,
      error: facCheck.error,
      code: facCheck.code,
    };
  }

  if (!membership) {
    return {
      authorized: false,
      error:
        'You do not have an established membership record for this healthcare facility.',
      code: 'MEMBERSHIP_NOT_FOUND',
    };
  }

  const memCheck = checkMembershipStatus(membership.status);
  if (!memCheck.active) {
    return {
      authorized: false,
      error: memCheck.error,
      code: memCheck.code,
    };
  }

  return {
    authorized: true,
    role: membership.role,
    permissions: membership.permissions || DEFAULT_ROLE_PERMISSIONS[membership.role] || [],
  };
}

/**
 * Clinical Record Tenant Boundary Verification:
 * Guarantees that requested patient and encounter records belong strictly to the active facility context.
 */
export function verifyFacilityClinicalAccess(
  activeMembership: FacilityMembership,
  patientFacilityId: string,
  encounterFacilityId?: string
): {
  authorized: boolean;
  error?: string;
  code?: string;
} {
  if (!activeMembership || !activeMembership.facilityId) {
    return {
      authorized: false,
      error: 'Active facility membership context is required.',
      code: 'NO_ACTIVE_MEMBERSHIP',
    };
  }

  if (activeMembership.facilityId !== patientFacilityId) {
    return {
      authorized: false,
      error:
        'Cross-facility access denied: The requested patient record belongs to another healthcare facility.',
      code: 'CROSS_FACILITY_PATIENT_ACCESS_DENIED',
    };
  }

  if (encounterFacilityId && activeMembership.facilityId !== encounterFacilityId) {
    return {
      authorized: false,
      error:
        'Cross-facility access denied: The requested encounter belongs to another healthcare facility.',
      code: 'CROSS_FACILITY_ENCOUNTER_ACCESS_DENIED',
    };
  }

  return { authorized: true };
}

/**
 * Membership Management Authorization:
 * Enforces that only authorized FacilityAdmins (for their own facility) or PlatformAdmins can manage memberships.
 * Regular clinicians/staff cannot grant roles or mutate memberships.
 */
export function canManageFacilityMemberships(
  callerRole: UserRole,
  callerFacilityId: string | null | undefined,
  targetFacilityId: string,
  isPlatformAdmin: boolean
): {
  authorized: boolean;
  error?: string;
  code?: string;
} {
  if (isPlatformAdmin || callerRole === 'PlatformAdmin') {
    return { authorized: true };
  }

  if (callerRole === 'FacilityAdmin' || callerRole === 'Admin') {
    if (callerFacilityId === targetFacilityId) {
      return { authorized: true };
    }
    return {
      authorized: false,
      error:
        'Facility Administrators can only manage memberships within their own assigned facility.',
      code: 'UNAUTHORIZED_CROSS_FACILITY_MANAGEMENT',
    };
  }

  return {
    authorized: false,
    error:
      'Access denied: You do not possess administrative authority to manage facility memberships or assign roles.',
    code: 'INSUFFICIENT_MEMBERSHIP_PERMISSIONS',
  };
}

/**
 * Safe Backward-Compatibility Resolver:
 * Links existing legacy UserProfile records to the multi-facility membership architecture without data loss.
 */
export function resolveUserMemberships(
  userId: string,
  storedMemberships: FacilityMembership[],
  legacyProfile?: UserProfile | null,
  knownFacilityCode?: string
): FacilityMembership[] {
  const directMatches = storedMemberships.filter((m) => m.userId === userId);
  if (directMatches.length > 0) {
    return directMatches;
  }

  // Synthesize non-destructive fallback if user has an existing single-facility legacy record
  if (legacyProfile && legacyProfile.facilityId) {
    const nowIso = legacyProfile.createdAt || new Date().toISOString();
    const username = legacyProfile.email.split('@')[0] || `user_${legacyProfile.id.slice(-6)}`;
    const normalized = normalizeUsername(username);
    const syntheticMembership: FacilityMembership = {
      membershipId: generateMembershipId(legacyProfile.facilityId, normalized),
      userId: legacyProfile.id,
      facilityId: legacyProfile.facilityId,
      facilityCode: knownFacilityCode || 'CB-LEGACY',
      username,
      normalizedUsername: normalized,
      role: legacyProfile.role,
      departmentId: legacyProfile.department || 'General Outpatient (GOPD)',
      status: 'Active',
      permissions: DEFAULT_ROLE_PERMISSIONS[legacyProfile.role] || [],
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: 'system_migration_compat',
      displayName: legacyProfile.name,
      email: legacyProfile.email,
    };
    return [syntheticMembership];
  }

  return [];
}
