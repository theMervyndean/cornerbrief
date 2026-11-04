import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  Activity,
  AlertCircle,
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  AppView,
  AuditLog,
  Encounter,
  Facility,
  FacilityStatus,
  FacilityType,
  FacilityMembership,
  OriginalEncounterInput,
  Patient,
  StructuredAiDocumentation,
  UserProfile,
  UserRole,
} from './types';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './lib/firebase';
import {
  buildSeedDataset,
  calculateAge,
  generateUniquePatientCode,
  getTodayDateString,
} from './data/seedData';
import { LoginScreen } from './components/LoginScreen';
import {
  FacilityOnboardingModal,
  FacilityOnboardingPayload,
} from './components/FacilityOnboardingModal';
import { PlatformAdminView } from './components/PlatformAdminView';
import { PatientModal } from './components/PatientModal';
import { DashboardView } from './components/DashboardView';
import { PatientsView } from './components/PatientsView';
import { PatientProfileView } from './components/PatientProfileView';
import { NewEncounterView } from './components/NewEncounterView';
import { AiDocumentationView } from './components/AiDocumentationView';
import { EncountersView } from './components/EncountersView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { Tooltip } from './components/Tooltip';
import { WorkspaceBootSkeleton } from './components/SkeletonLoader';
import { CornerBriefLogo } from './components/CornerBriefLogo';

export default function App() {
  // Authentication & Session State
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isSandboxMode, setIsSandboxMode] = useState<boolean>(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState<boolean>(false);
  const [isStaffSession, setIsStaffSession] = useState<boolean>(false);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active User Profile & Role
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Multi-Tenant Relational Application State
  const defaultSeed = buildSeedDataset('sandbox_demo');
  const [facilities, setFacilities] = useState<Facility[]>(defaultSeed.facilities);
  const [activeFacilityId, setActiveFacilityId] = useState<string>(defaultSeed.facility.id);
  const [staffDirectory, setStaffDirectory] = useState<UserProfile[]>(
    defaultSeed.staffDirectory
  );
  const [facilityMemberships, setFacilityMemberships] = useState<FacilityMembership[]>(
    defaultSeed.facilityMemberships || []
  );
  const [patients, setPatients] = useState<Patient[]>(defaultSeed.patients);
  const [encounters, setEncounters] = useState<Encounter[]>(defaultSeed.encounters);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(defaultSeed.auditLogs);

  // Navigation & Active Selection State
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);
  const [newEncounterPatientId, setNewEncounterPatientId] = useState<string | null>(null);
  const [newEncounterDepartment, setNewEncounterDepartment] = useState<string | null>(
    null
  );
  const [externalGeneratingEncounterId, setExternalGeneratingEncounterId] = useState<
    string | null
  >(null);
  const [highlightedTimelineEncounterId, setHighlightedTimelineEncounterId] = useState<
    string | null
  >(null);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState<boolean>(false);

  // Modals, Onboarding Wizard, Sidebar Collapse & UI Overlays
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState<boolean>(false);
  const [onboardingDefaultType, setOnboardingDefaultType] =
    useState<FacilityType>('Hospital');
  const [isPatientModalOpen, setIsPatientModalOpen] = useState<boolean>(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);

  // Global Top-Bar Search
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const [globalBannerError, setGlobalBannerError] = useState<string | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Derive Active Facility & Tenant-Isolated Datasets
  const activeFacility: Facility =
    facilities.find((f) => f.id === activeFacilityId) ||
    facilities[0] ||
    defaultSeed.facility;

  const facilityPatients = patients.filter((p) => p.facilityId === activeFacility.id);
  const facilityEncounters = encounters.filter((e) => e.facilityId === activeFacility.id);
  const facilityStaff = staffDirectory.filter((s) => s.facilityId === activeFacility.id);
  const facilityAuditLogs = auditLogs.filter((l) => l.facilityId === activeFacility.id);

  // Hydrate active server session on initial mount if available (Stage 2C)
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data?.session && data?.facility && data?.membership) {
          setIsStaffSession(true);
          setIsSandboxMode(false);
          setIsPlatformAdmin(false);
          const { facility, membership } = data;
          setFacilities((prev) => {
            const exists = prev.some((f) => f.id === facility.id);
            return exists ? prev : [facility, ...prev];
          });
          setActiveFacilityId(facility.id);
          const profile: UserProfile = {
            id: membership.userId || `usr_${membership.normalizedUsername}`,
            ownerId: facility.ownerId || 'system',
            name: membership.username,
            email: `${membership.normalizedUsername}@${facility.facilityCode.toLowerCase()}.cornerbrief.ng`,
            role: (membership.role === 'Admin' ? 'Admin' : membership.role === 'FacilityAdmin' ? 'FacilityAdmin' : membership.role === 'Staff' ? 'Staff' : 'Clinician') as UserRole,
            facilityId: facility.id,
            department: membership.departmentId || facility.departments?.[0] || 'General Outpatient (GOPD)',
            createdAt: membership.createdAt || new Date().toISOString(),
          };
          setCurrentUser(profile);
          setStaffDirectory((prev) => {
            const filtered = prev.filter((s) => s.id !== profile.id);
            return [profile, ...filtered];
          });
        }
      })
      .catch(() => {});
  }, []);

  // Close search & notifications dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchDropdownOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen to Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        setIsSandboxMode(false);
        setIsStaffSession(false);
        setAuthError(null);
        await initializeFirestoreWorkspace(user);
      } else if (!isSandboxMode && !isStaffSession) {
        setFirebaseUser(null);
        setCurrentUser(null);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, [isSandboxMode, isStaffSession]);

  // Load authenticated profile, verify administrative privileges, and initialize workspace
  const initializeFirestoreWorkspace = async (
    user: FirebaseUser,
    preferredFacilityId?: string
  ) => {
    const uid = user.uid;
    const seed = buildSeedDataset(uid);
    const chosenFac =
      seed.facilities.find((f) => f.id === preferredFacilityId) || seed.facility;

    let loadedRole: UserRole = 'Clinician';
    let loadedName = user.displayName || 'Healthcare Professional';
    let loadedFacilityId = preferredFacilityId || chosenFac.id;
    let loadedDept = chosenFac.departments?.[0] || 'General Outpatient (GOPD)';
    let isPlatformAdminVerified = false;

    // 1. Safe Bootstrap Check: Platform bootstrap administrator email
    if (user.email === 'mervyndeanhilary@gmail.com' && user.emailVerified) {
      loadedRole = 'PlatformAdmin';
      isPlatformAdminVerified = true;
    }

    // 2. Query /users/{uid} for persisted staff profile
    let rawPersistedRole: UserRole | null = null;
    try {
      const userDocSnap = await getDoc(doc(db, 'users', uid));
      if (userDocSnap.exists()) {
        const data = userDocSnap.data() as UserProfile;
        if (data.role) rawPersistedRole = data.role;
        if (data.name) loadedName = data.name;
        if (data.facilityId) loadedFacilityId = data.facilityId;
        if (data.department) loadedDept = data.department;
      }
    } catch (err) {
      console.warn('Could not load user document from server:', err);
    }

    // 3. Cryptographically verify administrative authority via trusted server endpoint
    let isFacilityAdminVerified = false;
    try {
      const token = await user.getIdToken();
      const callerRes = await fetch('/api/admin/verify-caller', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (callerRes.ok) {
        const callerData = await callerRes.json();
        if (callerData.isPlatformAdmin) {
          isPlatformAdminVerified = true;
        }
        if (callerData.isFacilityAdmin) {
          isFacilityAdminVerified = true;
        }
      }
    } catch (err) {
      console.warn('Could not verify caller admin status:', err);
    }

    // Establish authorized active role: Never trust unverified client-readable elevated roles
    if (isPlatformAdminVerified) {
      loadedRole = 'PlatformAdmin';
    } else if (isFacilityAdminVerified) {
      loadedRole = rawPersistedRole === 'Admin' ? 'Admin' : 'FacilityAdmin';
    } else {
      // Non-administrator: If the persisted profile claims an elevated administrative role, demote to Clinician
      if (
        rawPersistedRole === 'PlatformAdmin' ||
        rawPersistedRole === 'FacilityAdmin' ||
        rawPersistedRole === 'Admin'
      ) {
        console.warn(
          'Unverified administrative role in Firestore profile was rejected by trusted authority. Demoting session to Clinician.'
        );
        loadedRole = 'Clinician';
      } else if (rawPersistedRole) {
        loadedRole = rawPersistedRole;
      } else {
        loadedRole = 'Clinician';
      }
    }

    setIsPlatformAdmin(isPlatformAdminVerified);

    const activeProfile: UserProfile = {
      id: uid,
      ownerId: uid,
      name: loadedName,
      email: user.email || 'staff@cornerbrief.ng',
      role: loadedRole,
      facilityId: loadedFacilityId,
      department: loadedDept,
      createdAt: new Date().toISOString(),
    };
    setCurrentUser(activeProfile);
    setActiveFacilityId(loadedFacilityId);
    setStaffDirectory([activeProfile, ...seed.staffDirectory.slice(1)]);

    try {
      const facQuery = query(collection(db, 'facilities'), where('ownerId', '==', uid));
      const existingFacs = await getDocs(facQuery);

      if (existingFacs.empty) {
        for (const fac of seed.facilities) {
          await setDoc(doc(db, 'facilities', fac.id), fac);
        }
        for (const pat of seed.patients) {
          await setDoc(doc(db, 'patients', pat.id), pat);
        }
        for (const enc of seed.encounters) {
          await setDoc(doc(db, 'encounters', enc.id), enc);
        }
        for (const log of seed.auditLogs) {
          await setDoc(doc(db, 'auditLogs', log.id), log);
        }
      }
    } catch (error) {
      console.error('Workspace initialization check:', error);
    }
  };

  // Attach Firestore Real-Time Listeners when firebaseUser is present
  useEffect(() => {
    if (!firebaseUser || isSandboxMode) return;
    const uid = firebaseUser.uid;
    const seed = buildSeedDataset(uid);

    const facQuery = query(collection(db, 'facilities'), where('ownerId', '==', uid));
    const unsubFac = onSnapshot(
      facQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Facility);
        const resolved = list.length > 0 ? list : seed.facilities;
        setFacilities(resolved);
        setActiveFacilityId((prev) =>
          resolved.some((f) => f.id === prev) ? prev : resolved[0].id
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'facilities')
    );

    const patQuery = query(collection(db, 'patients'), where('ownerId', '==', uid));
    const unsubPat = onSnapshot(
      patQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Patient);
        setPatients(list.length > 0 ? list : seed.patients);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'patients')
    );

    const encQuery = query(collection(db, 'encounters'), where('ownerId', '==', uid));
    const unsubEnc = onSnapshot(
      encQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Encounter);
        setEncounters(list.length > 0 ? list : seed.encounters);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'encounters')
    );

    const audQuery = query(collection(db, 'auditLogs'), where('ownerId', '==', uid));
    const unsubAud = onSnapshot(
      audQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as AuditLog);
        setAuditLogs(list.length > 0 ? list : seed.auditLogs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs')
    );

    return () => {
      unsubFac();
      unsubPat();
      unsubEnc();
      unsubAud();
    };
  }, [firebaseUser, isSandboxMode]);

  // Sign in with Google Popup
  const handleGoogleSignIn = async (facilityId?: string) => {
    setAuthError(null);
    setIsAuthenticating(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (facilityId && cred.user) {
        await initializeFirestoreWorkspace(cred.user, facilityId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('popup-closed-by-user') || msg.includes('popup-blocked')) {
        setAuthError(
          'Google sign-in popup was closed or blocked by your browser. You can try again or enter a Facility Workspace directly below.'
        );
      } else {
        setAuthError(
          'Unable to complete Google sign-in inside this preview frame. You can enter any Facility Workspace directly below.'
        );
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Authenticate Hospital Staff with Hospital Code, Username, and Password (Stage 2C)
  const handleStaffSignIn = async (hospitalCode: string, username: string, password: string) => {
    setAuthError(null);
    setIsAuthenticating(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitalCode, username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Authentication failed. Please verify your credentials.');
      }

      const { membership, facility } = data;
      setIsStaffSession(true);
      setIsSandboxMode(false);
      setIsPlatformAdmin(false); // Staff credentials can never grant PlatformAdmin privileges

      setFacilities((prev) => {
        const exists = prev.some((f) => f.id === facility.id);
        return exists ? prev : [facility, ...prev];
      });
      setActiveFacilityId(facility.id);

      const profile: UserProfile = {
        id: membership.userId || `usr_${membership.normalizedUsername}`,
        ownerId: facility.ownerId || 'system',
        name: membership.username,
        email: `${membership.normalizedUsername}@${facility.facilityCode.toLowerCase()}.cornerbrief.ng`,
        role: (membership.role === 'Admin' ? 'Admin' : membership.role === 'FacilityAdmin' ? 'FacilityAdmin' : membership.role === 'Staff' ? 'Staff' : 'Clinician') as UserRole,
        facilityId: facility.id,
        department: membership.departmentId || facility.departments?.[0] || 'General Outpatient (GOPD)',
        createdAt: membership.createdAt || new Date().toISOString(),
      };

      setCurrentUser(profile);
      setStaffDirectory((prev) => {
        const filtered = prev.filter((s) => s.id !== profile.id);
        return [profile, ...filtered];
      });

      const facPatients = patients.filter((p) => p.facilityId === facility.id);
      const facEncounters = encounters.filter((e) => e.facilityId === facility.id);
      setSelectedPatientId(facPatients[0]?.id || null);
      setSelectedEncounterId(facEncounters[0]?.id || null);
      setActiveView('dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAuthError(msg);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Enter Sandbox / Clinical Evaluation Mode for a specific Role & Facility (Strictly In-Memory)
  const handleDemoSignIn = (role: UserRole, requestedFacilityId?: string) => {
    setAuthError(null);
    setIsWorkspaceLoading(true);
    // Sandbox mode can NEVER possess PlatformAdmin privileges
    setIsPlatformAdmin(false);
    const safeRole: UserRole = role === 'PlatformAdmin' ? 'Clinician' : role;

    const chosenFacility =
      facilities.find((f) => f.id === requestedFacilityId) ||
      facilities[0] ||
      defaultSeed.facility;

    const matchedProfile =
      staffDirectory.find(
        (u) => u.facilityId === chosenFacility.id && u.role === safeRole
      ) ||
      staffDirectory.find((u) => u.facilityId === chosenFacility.id) || {
        id: `usr_${safeRole.toLowerCase()}_sandbox`,
        ownerId: chosenFacility.ownerId,
        name:
          safeRole === 'Admin'
            ? 'Chinedu Eze'
            : safeRole === 'Staff'
            ? 'Amina Bello'
            : 'Dr. Adaeze Okafor',
        email: `${safeRole.toLowerCase()}@cornerbrief-demo.ng`,
        role: safeRole,
        facilityId: chosenFacility.id,
        department: chosenFacility.departments?.[0] || 'General Outpatient (GOPD)',
        createdAt: new Date().toISOString(),
      };

    setIsSandboxMode(true);
    setActiveFacilityId(chosenFacility.id);
    setCurrentUser({ ...matchedProfile, role: safeRole, facilityId: chosenFacility.id });

    const facPatients = patients.filter((p) => p.facilityId === chosenFacility.id);
    const facEncounters = encounters.filter((e) => e.facilityId === chosenFacility.id);
    setSelectedPatientId(facPatients[0]?.id || null);
    setSelectedEncounterId(facEncounters[0]?.id || null);
    setActiveView('dashboard');

    setTimeout(() => {
      setIsWorkspaceLoading(false);
    }, 220);
  };

  // Switch active facility tenant inside the workspace
  const handleSwitchFacility = (newFacilityId: string) => {
    const targetFac = facilities.find((f) => f.id === newFacilityId);
    if (!targetFac) return;

    setActiveFacilityId(targetFac.id);

    // Update active facility context without identity or role spoofing
    if (currentUser) {
      if (isSandboxMode) {
        const roleMatch = staffDirectory.find(
          (s) => s.facilityId === targetFac.id && s.role === currentUser.role
        );
        if (roleMatch) {
          setCurrentUser(roleMatch);
        } else {
          setCurrentUser({
            ...currentUser,
            facilityId: targetFac.id,
            department: targetFac.departments?.[0] || 'General Outpatient (GOPD)',
          });
        }
      } else if (isPlatformAdmin) {
        // Authenticated Platform Admin switching facility view maintains authentic UID and verified role
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                facilityId: targetFac.id,
              }
            : prev
        );
      }
    }

    const facPatients = patients.filter((p) => p.facilityId === targetFac.id);
    const facEncounters = encounters.filter((e) => e.facilityId === targetFac.id);
    setSelectedPatientId(facPatients[0]?.id || null);
    setSelectedEncounterId(facEncounters[0]?.id || null);

    if (
      activeView === 'patient-profile' ||
      activeView === 'ai-documentation' ||
      activeView === 'new-encounter' ||
      activeView === 'platform-admin'
    ) {
      setActiveView('dashboard');
    }
  };

  // Complete 4-Step Facility Registration & Onboarding (Stage 2A)
  const handleCompleteFacilityOnboarding = async (
    payload: FacilityOnboardingPayload,
    registeredFacility?: Facility
  ) => {
    const ownerUid = firebaseUser ? firebaseUser.uid : 'sandbox_demo';
    const shortId = `${Date.now().toString().slice(-5)}`;
    const normalizedCode = (payload.facilityCode || 'CB-FAC').trim().toUpperCase();
    const newFacilityId =
      registeredFacility?.id ||
      `fac_${normalizedCode.toLowerCase().replace(/[^a-z0-9]/g, '')}_${shortId}`;
    const nowIso = registeredFacility?.createdAt || new Date().toISOString();
    const todayStr = getTodayDateString();

    const newFacility: Facility = registeredFacility || {
      id: newFacilityId,
      ownerId: ownerUid,
      name: payload.name,
      location: `${payload.address}, ${payload.city}, ${payload.state}`,
      facilityType: payload.facilityType,
      facilityCode: normalizedCode,
      state: payload.state,
      status: 'Pending', // Newly registered facility receives Pending status
      departments: payload.departments,
      contactEmail: payload.contactEmail,
      contactPhone: payload.contactPhone,
      adminName: payload.adminName,
      adminEmail: payload.adminEmail,
      adminRoleTitle: payload.adminRoleTitle,
      createdAt: nowIso,
    };

    const adminUser: UserProfile = {
      id: `usr_admin_${shortId}`,
      ownerId: ownerUid,
      name: payload.adminName,
      email: payload.adminEmail,
      role: 'Admin',
      facilityId: newFacilityId,
      department: payload.adminRoleTitle || 'Hospital Administration',
      createdAt: nowIso,
    };

    const onboardingLog: AuditLog = {
      id: `aud_${shortId}_init`,
      ownerId: ownerUid,
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: 'Admin',
      facilityId: newFacilityId,
      action: `Submitted facility registration for ${payload.name} (${payload.facilityType}) with Hospital Code ${normalizedCode} (Status: ${newFacility.status || 'Pending'})`,
      patientId: '',
      encounterId: '',
      timestamp: nowIso,
    };

    if (firebaseUser && !isSandboxMode) {
      try {
        await setDoc(doc(db, 'facilities', newFacility.id), newFacility);
        await setDoc(doc(db, 'auditLogs', onboardingLog.id), onboardingLog);
      } catch (firestoreErr) {
        console.warn('Client Firestore write warning for newly registered facility:', firestoreErr);
      }
    }
    setFacilities((prev) => [
      newFacility,
      ...prev.filter((f) => f.id !== newFacility.id),
    ]);
    setAuditLogs((prev) => [onboardingLog, ...prev]);

    // CONTROLLED LIFECYCLE GATE:
    // If facility is Pending, DO NOT activate workspace or route to clinical dashboard.
    // The onboarding modal will display the Pending confirmation screen.
    if (newFacility.status === 'Pending') {
      return;
    }

    const extraStaff: UserProfile[] = payload.initialStaff.map((member, idx) => ({
      id: `usr_staff_${shortId}_${idx}`,
      ownerId: ownerUid,
      name: member.name,
      email: member.email,
      role: member.role,
      facilityId: newFacilityId,
      department: member.department || payload.departments[0] || 'General Outpatient (GOPD)',
      createdAt: nowIso,
    }));

    const hasClinician = extraStaff.some((s) => s.role === 'Clinician');
    const defaultClinician: UserProfile = hasClinician
      ? extraStaff.find((s) => s.role === 'Clinician')!
      : {
          id: `usr_clin_${shortId}`,
          ownerId: ownerUid,
          name: payload.adminName.startsWith('Dr.')
            ? payload.adminName
            : `Dr. ${payload.adminName}`,
          email: payload.adminEmail,
          role: 'Clinician',
          facilityId: newFacilityId,
          department: payload.departments[0] || 'General Outpatient (GOPD)',
          createdAt: nowIso,
        };

    const allNewStaff = hasClinician
      ? [adminUser, ...extraStaff]
      : [adminUser, defaultClinician, ...extraStaff];

    const starterPatients: Patient[] = [];
    const starterEncounters: Encounter[] = [];

    if (payload.includeStarterPatients) {
      const pat1Id = `pat_${shortId}_1`;
      const pat2Id = `pat_${shortId}_2`;
      const code1 = generateUniquePatientCode(0, payload.facilityCode);
      const code2 = generateUniquePatientCode(1, payload.facilityCode);

      starterPatients.push(
        {
          id: pat1Id,
          ownerId: ownerUid,
          patientId: code1,
          facilityId: newFacilityId,
          firstName: 'Chukwudi',
          lastName: 'Nnamdi',
          dateOfBirth: '1983-05-16',
          sex: 'Male',
          phone: '+234 803 512 9084',
          email: 'chukwudi.nnamdi@example.ng',
          address: `12 Main Avenue, ${payload.city}, ${payload.state}`,
          emergencyContact: 'Amaka Nnamdi (Spouse) — +234 802 411 7721',
          status: 'Active',
          notes: `Initial outpatient registration at ${payload.name}.`,
          createdAt: nowIso,
        },
        {
          id: pat2Id,
          ownerId: ownerUid,
          patientId: code2,
          facilityId: newFacilityId,
          firstName: 'Fatima',
          lastName: 'Bello',
          dateOfBirth: '1991-10-08',
          sex: 'Female',
          phone: '+234 809 614 2210',
          email: 'fatima.bello@example.ng',
          address: `5 Crescent Road, ${payload.city}, ${payload.state}`,
          emergencyContact: 'Ibrahim Bello (Brother) — +234 805 339 1020',
          status: 'Follow-Up',
          notes: 'Scheduled routine blood pressure & wellness review.',
          createdAt: nowIso,
        }
      );

      const enc1Id = `enc_${shortId}_1`;
      starterEncounters.push({
        id: enc1Id,
        ownerId: ownerUid,
        patientId: pat1Id,
        facilityId: newFacilityId,
        clinicianId: defaultClinician.id,
        clinicianName: defaultClinician.name,
        department: payload.departments[0] || 'General Outpatient (GOPD)',
        encounterDate: todayStr,
        encounterType: 'Initial Outpatient Consultation',
        reasonForVisit:
          'Baseline blood pressure evaluation and 2-day history of mild fatigue.',
        originalInput: {
          reasonForVisit:
            'Baseline blood pressure evaluation and 2-day history of mild fatigue.',
          patientReportedInfo:
            'Patient presented for baseline check-up after registering at the facility. Reports mild fatigue over the past 2 days following busy work schedule. Denies fever, headache, chest pain, or shortness of breath.',
          relevantHistory: 'No prior chronic medical illness or surgical admissions.',
          currentMedications: 'None currently.',
          allergies: 'No known drug allergies (NKDA).',
          investigations:
            'Sitting BP: 128/82 mmHg. Pulse: 76 bpm regular. Temperature: 36.7°C. SpO2: 99% on room air. Random Blood Glucose: 98 mg/dL.',
          clinicianObservations:
            'Alert, afebrile, well-hydrated adult in no distress. Cardiovascular and respiratory examinations normal.',
          additionalNotes:
            'Counselled on adequate hydration, balanced nutrition, and routine annual wellness check.',
        },
        aiDocumentation: {
          encounterSummary: `Initial Outpatient Consultation at ${payload.name} for baseline blood pressure evaluation and a 2-day history of mild work-related fatigue. Vital signs were normal (BP 128/82 mmHg, Pulse 76 bpm, Temp 36.7°C) and random blood glucose was 98 mg/dL.`,
          presentingConcern:
            'Baseline blood pressure evaluation and 2-day history of mild fatigue.',
          relevantHistory: ['No prior chronic medical illness or surgical admissions.'],
          medications: ['Not provided.'],
          allergies: ['No known drug allergies (NKDA).'],
          investigations: [
            'Sitting BP: 128/82 mmHg; Pulse: 76 bpm regular',
            'Temperature: 36.7°C; SpO2: 99% on room air',
            'Random Blood Glucose: 98 mg/dL',
          ],
          clinicalNotes: [
            'Reports mild fatigue for 2 days; denies fever, headache, chest pain, or dyspnoea.',
            'Cardiovascular and respiratory examination normal.',
          ],
          followUpItems: [
            'Maintain adequate oral hydration and sleep hygiene.',
            'Routine wellness follow-up as needed.',
          ],
          missingInformation: ['Body weight / BMI measurement not recorded.'],
          requiresReview: true,
        },
        reviewedDocumentation: null,
        status: 'Pending Review',
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }

    if (firebaseUser && !isSandboxMode) {
      for (const pat of starterPatients) {
        await setDoc(doc(db, 'patients', pat.id), pat);
      }
      for (const enc of starterEncounters) {
        await setDoc(doc(db, 'encounters', enc.id), enc);
      }
    } else {
      setPatients((prev) => [...starterPatients, ...prev]);
      setEncounters((prev) => [...starterEncounters, ...prev]);
    }

    setStaffDirectory((prev) => [...allNewStaff, ...prev]);
    setActiveFacilityId(newFacilityId);
    setCurrentUser(defaultClinician);
    setSelectedPatientId(starterPatients[0]?.id || null);
    setSelectedEncounterId(starterEncounters[0]?.id || null);
    setIsOnboardingModalOpen(false);
    setActiveView('dashboard');
  };

  // Sign out back to Public CornerBrief Website
  const handleSignOut = async () => {
    setIsStaffSession(false);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // server logout failover
    }
    if (firebaseUser) {
      await signOut(auth);
    }
    setFirebaseUser(null);
    setIsSandboxMode(false);
    setIsPlatformAdmin(false);
    setCurrentUser(null);
    setActiveView('dashboard');
  };

  // Append an immutable AuditLog entry scoped to activeFacility
  const recordAuditEvent = async (
    action: string,
    patientId: string = '',
    encounterId: string = '',
    overrideFacilityId?: string
  ) => {
    if (!currentUser) return;
    const targetFacilityId = overrideFacilityId || activeFacility.id;
    const newLog: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ownerId: currentUser.ownerId,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      facilityId: targetFacilityId,
      action,
      patientId,
      encounterId,
      timestamp: new Date().toISOString(),
    };

    if (firebaseUser && !isSandboxMode) {
      try {
        await setDoc(doc(db, 'auditLogs', newLog.id), newLog);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `auditLogs/${newLog.id}`);
      }
    } else {
      setAuditLogs((prev) => [newLog, ...prev]);
    }
  };

  // Create or Update Patient Record (Scoped strictly to activeFacility.id)
  const handleSavePatient = async (
    data: Omit<Patient, 'id' | 'ownerId' | 'facilityId' | 'createdAt'>,
    existingId?: string
  ) => {
    if (!currentUser) return;
    setGlobalBannerError(null);

    if (existingId) {
      const existing = patients.find((p) => p.id === existingId);
      if (!existing) return;
      const updatedPatient: Patient = {
        ...existing,
        ...data,
        patientId: existing.patientId,
      };

      if (firebaseUser && !isSandboxMode) {
        try {
          await updateDoc(doc(db, 'patients', existingId), { ...updatedPatient });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `patients/${existingId}`);
        }
      } else {
        setPatients((prev) => prev.map((p) => (p.id === existingId ? updatedPatient : p)));
      }
      await recordAuditEvent(
        `Updated patient record ${updatedPatient.patientId} (${updatedPatient.firstName} ${updatedPatient.lastName})`,
        existingId
      );
      setSelectedPatientId(existingId);
    } else {
      const newDocId = `pat_${Date.now()}`;
      const newPatient: Patient = {
        ...data,
        id: newDocId,
        ownerId: currentUser.ownerId,
        facilityId: activeFacility.id,
        createdAt: new Date().toISOString(),
      };

      if (firebaseUser && !isSandboxMode) {
        try {
          await setDoc(doc(db, 'patients', newDocId), newPatient);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `patients/${newDocId}`);
        }
      } else {
        setPatients((prev) => [newPatient, ...prev]);
      }
      await recordAuditEvent(
        `Registered new patient ${newPatient.patientId} (${newPatient.firstName} ${newPatient.lastName})`,
        newDocId
      );
      setSelectedPatientId(newDocId);
      setActiveView('patient-profile');
    }
  };

  // Helper for isolated sandbox evaluation when unauthenticated
  const buildSandboxDocumentation = (
    encounterType: string,
    encounterDate: string,
    input: OriginalEncounterInput,
    _patientObj?: Patient
  ): StructuredAiDocumentation => {
    const reason = (input.reasonForVisit || '').trim();
    const narrative = (input.patientReportedInfo || '').trim();
    const history = (input.relevantHistory || '').trim();
    const meds = (input.currentMedications || '').trim();
    const allergies = (input.allergies || '').trim();
    const investigations = (input.investigations || '').trim();
    const observations = (input.clinicianObservations || '').trim();
    const notes = (input.additionalNotes || '').trim();

    const splitLines = (text: string): string[] => {
      if (!text) return ['Not provided.'];
      const parts = text
        .split(/\r?\n|;|•/)
        .map((s) => s.replace(/^[-*]\s*/, '').trim())
        .filter(Boolean);
      return parts.length > 0 ? parts : ['Not provided.'];
    };

    const summaryParts: string[] = [];
    summaryParts.push(`${encounterType}${encounterDate ? ` recorded on ${encounterDate}` : ''}.`);
    if (reason) summaryParts.push(`Reason: ${reason}.`);
    if (narrative) summaryParts.push(`Patient narrative: ${narrative}.`);
    if (observations) summaryParts.push(`Clinician observations: ${observations}.`);

    const missing: string[] = [];
    if (!reason) missing.push('Reason for visit not specified.');
    if (!history) missing.push('Past history not recorded.');
    if (!meds) missing.push('Current medications not listed.');
    if (!allergies) missing.push('Allergy status not documented.');

    return {
      encounterSummary: summaryParts.join(' ') || 'Clinical encounter recorded.',
      presentingConcern: reason || 'Not provided.',
      relevantHistory: splitLines(history),
      medications: splitLines(meds),
      allergies: splitLines(allergies),
      investigations: splitLines(investigations),
      clinicalNotes: splitLines(`${observations}\n${notes}`.trim()),
      followUpItems: ['Routine clinical follow-up as advised.'],
      missingInformation: missing.length > 0 ? missing : ['All core encounter fields were supplied.'],
      requiresReview: true,
    };
  };

  // Call Server-Side NONYE AI Endpoint with Bearer ID Token and Ownership Verification
  const requestNonyeAiDocumentation = async (
    encounterType: string,
    encounterDate: string,
    originalInput: OriginalEncounterInput,
    patientObj?: Patient,
    encounterId?: string
  ): Promise<StructuredAiDocumentation> => {
    // If evaluating in public Sandbox mode without a Firebase user session,
    // process locally in isolated state without calling the protected endpoint
    if (isSandboxMode || !firebaseUser) {
      return buildSandboxDocumentation(encounterType, encounterDate, originalInput, patientObj);
    }

    // In authenticated production mode, obtain a fresh Firebase ID token
    let token: string;
    try {
      token = await firebaseUser.getIdToken();
    } catch {
      throw new Error('Your clinical session has expired. Please sign in again.');
    }

    const response = await fetch('/api/ai/generate-documentation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        patientId: patientObj?.id,
        facilityId: patientObj?.facilityId || activeFacility.id,
        encounterId,
        encounterInput: {
          ...originalInput,
          encounterType,
          encounterDate,
        },
        patientContext: patientObj
          ? {
              sex: patientObj.sex,
              age: calculateAge(patientObj.dateOfBirth),
            }
          : undefined,
      }),
    });

    if (response.status === 401) {
      throw new Error(
        'Your clinical session has expired or authentication is invalid. Please sign in again.'
      );
    }

    if (response.status === 403) {
      const errPayload = await response.json().catch(() => null);
      throw new Error(
        errPayload?.error ||
          'Access denied. You are not authorized to generate clinical documentation for this patient.'
      );
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.documentation) {
      throw new Error(
        payload?.error || 'Unable to generate documentation. Please try again.'
      );
    }
    return payload.documentation as StructuredAiDocumentation;
  };

  // Create New Encounter (Save as Draft OR Generate with NONYE AI)
  const handleCreateEncounter = async (
    payload: {
      patientId: string;
      encounterDate: string;
      encounterType: string;
      originalInput: OriginalEncounterInput;
      department?: string;
    },
    generateAiImmediately: boolean
  ) => {
    if (!currentUser) return;
    if (currentUser.role === 'Staff') {
      throw new Error(
        'Role Restriction: Only authorized Clinicians or Admins can record clinical encounters.'
      );
    }

    const encId = `enc_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const patientObj = facilityPatients.find((p) => p.id === payload.patientId);

    const draftEncounter: Encounter = {
      id: encId,
      ownerId: currentUser.ownerId,
      patientId: payload.patientId,
      facilityId: activeFacility.id,
      clinicianId: currentUser.id,
      clinicianName: currentUser.name,
      department:
        payload.department ||
        currentUser.department ||
        activeFacility.departments?.[0] ||
        'General Outpatient (GOPD)',
      encounterDate: payload.encounterDate,
      encounterType: payload.encounterType,
      reasonForVisit: payload.originalInput.reasonForVisit.trim(),
      originalInput: payload.originalInput,
      aiDocumentation: null,
      reviewedDocumentation: null,
      status: 'Draft',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (firebaseUser && !isSandboxMode) {
      await setDoc(doc(db, 'encounters', encId), draftEncounter);
    } else {
      setEncounters((prev) => [draftEncounter, ...prev]);
    }

    await recordAuditEvent(
      `Created ${payload.encounterType} encounter draft`,
      payload.patientId,
      encId
    );

    if (!generateAiImmediately) {
      setSelectedPatientId(payload.patientId);
      setHighlightedTimelineEncounterId(encId);
      setActiveView('patient-profile');
      return;
    }

    // Navigate immediately to NONYE AI Documentation workspace so the live processing state is visible
    setSelectedEncounterId(encId);
    setSelectedPatientId(payload.patientId);
    setExternalGeneratingEncounterId(encId);
    setActiveView('ai-documentation');

    try {
      const aiDoc = await requestNonyeAiDocumentation(
        payload.encounterType,
        payload.encounterDate,
        payload.originalInput,
        patientObj,
        encId
      );

      const updatedEncounter: Encounter = {
        ...draftEncounter,
        aiDocumentation: aiDoc,
        status: 'Pending Review',
        updatedAt: new Date().toISOString(),
      };

      if (firebaseUser && !isSandboxMode) {
        await setDoc(doc(db, 'encounters', encId), updatedEncounter);
      } else {
        setEncounters((prev) => prev.map((e) => (e.id === encId ? updatedEncounter : e)));
      }

      await recordAuditEvent(
        `Generated NONYE AI structured documentation (Clinician Review Required)`,
        payload.patientId,
        encId
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGlobalBannerError(msg);
    } finally {
      setExternalGeneratingEncounterId(null);
    }
  };

  // Generate or Regenerate NONYE AI Documentation on an Existing Encounter
  const handleRegenerateAiDocumentation = async (
    encounterId: string,
    updatedOriginalInput?: OriginalEncounterInput
  ) => {
    if (!currentUser) return;
    if (currentUser.role === 'Staff') {
      throw new Error(
        'Role Restriction: Only Clinicians and Admins can generate AI documentation.'
      );
    }

    const existing = encounters.find((e) => e.id === encounterId);
    if (!existing) return;
    if (existing.status === 'Finalized') {
      throw new Error(
        'Finalized clinical records are locked and cannot be overwritten.'
      );
    }

    const inputToUse = updatedOriginalInput || existing.originalInput;
    const patientObj = patients.find((p) => p.id === existing.patientId);

    try {
      const aiDoc = await requestNonyeAiDocumentation(
        existing.encounterType,
        existing.encounterDate,
        inputToUse,
        patientObj,
        encounterId
      );

      const updatedEncounter: Encounter = {
        ...existing,
        originalInput: inputToUse,
        reasonForVisit: inputToUse.reasonForVisit.trim() || existing.reasonForVisit,
        aiDocumentation: aiDoc,
        reviewedDocumentation: null,
        status: 'Pending Review',
        updatedAt: new Date().toISOString(),
      };

      if (firebaseUser && !isSandboxMode) {
        await updateDoc(doc(db, 'encounters', encounterId), {
          originalInput: updatedEncounter.originalInput,
          reasonForVisit: updatedEncounter.reasonForVisit,
          aiDocumentation: updatedEncounter.aiDocumentation,
          reviewedDocumentation: null,
          status: updatedEncounter.status,
          updatedAt: updatedEncounter.updatedAt,
        });
      } else {
        setEncounters((prev) =>
          prev.map((e) => (e.id === encounterId ? updatedEncounter : e))
        );
      }

      await recordAuditEvent(
        `Generated NONYE AI structured documentation (Pending Clinician Review)`,
        existing.patientId,
        encounterId
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGlobalBannerError(msg);
    }
  };

  // Save Reviewed or Finalized Clinical Documentation
  const handleSaveReviewedDocumentation = async (
    encounterId: string,
    reviewedDoc: StructuredAiDocumentation,
    finalizeRecord: boolean
  ) => {
    if (!currentUser) return;
    if (currentUser.role === 'Staff') {
      throw new Error(
        'Role Restriction: Only Clinicians and Admins can review and finalize clinical documentation.'
      );
    }

    const existing = encounters.find((e) => e.id === encounterId);
    if (!existing) return;
    if (existing.status === 'Finalized') {
      throw new Error('This clinical record is already finalized and locked.');
    }

    const nowIso = new Date().toISOString();
    const newStatus = finalizeRecord ? 'Finalized' : 'Reviewed';

    const updatedEncounter: Encounter = {
      ...existing,
      reviewedDocumentation: {
        ...reviewedDoc,
        requiresReview: !finalizeRecord,
      },
      reviewedBy: currentUser.name,
      reviewedAt: nowIso,
      status: newStatus,
      updatedAt: nowIso,
    };

    if (firebaseUser && !isSandboxMode) {
      await updateDoc(doc(db, 'encounters', encounterId), {
        reviewedDocumentation: updatedEncounter.reviewedDocumentation,
        reviewedBy: updatedEncounter.reviewedBy,
        reviewedAt: updatedEncounter.reviewedAt,
        status: updatedEncounter.status,
        updatedAt: updatedEncounter.updatedAt,
      });
    } else {
      setEncounters((prev) =>
        prev.map((e) => (e.id === encounterId ? updatedEncounter : e))
      );
    }

    await recordAuditEvent(
      finalizeRecord
        ? `Reviewed, attested, and finalized clinical documentation`
        : `Saved clinician-reviewed documentation draft`,
      existing.patientId,
      encounterId
    );

    if (finalizeRecord) {
      setHighlightedTimelineEncounterId(encounterId);
    }
  };


  // Update Facility Details (Admin Only)
  const handleUpdateFacility = async (
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
  ) => {
    if (!currentUser || currentUser.role !== 'Admin') return;
    const updatedFacility: Facility = {
      ...activeFacility,
      name,
      location,
      ...(extra || {}),
    };

    if (firebaseUser && !isSandboxMode) {
      await updateDoc(doc(db, 'facilities', activeFacility.id), {
        name: updatedFacility.name,
        location: updatedFacility.location,
        facilityType: updatedFacility.facilityType || 'Specialist Clinic',
        facilityCode: updatedFacility.facilityCode || 'CB-NG',
        state: updatedFacility.state || 'Lagos State',
        departments: updatedFacility.departments || ['General Outpatient (GOPD)'],
        contactEmail: updatedFacility.contactEmail || '',
        contactPhone: updatedFacility.contactPhone || '',
      });
    } else {
      setFacilities((prev) =>
        prev.map((f) => (f.id === activeFacility.id ? updatedFacility : f))
      );
    }
    await recordAuditEvent(`Updated facility configuration for ${name}`);
  };

  // Update Facility Status (Platform Admin Console)
  const handleUpdateFacilityStatus = async (
    facilityId: string,
    status: FacilityStatus
  ) => {
    const target = facilities.find((f) => f.id === facilityId);
    if (!target) return;
    const updated: Facility = { ...target, status };

    if (firebaseUser && !isSandboxMode) {
      try {
        await updateDoc(doc(db, 'facilities', facilityId), { status });
      } catch (firestoreErr) {
        console.warn('Direct Firestore update warning for facility status:', firestoreErr);
      }
      try {
        const idToken = await firebaseUser.getIdToken();
        await fetch(`/api/facilities/${encodeURIComponent(facilityId)}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ status }),
        });
      } catch (endpointErr) {
        console.warn('Backend status endpoint sync warning:', endpointErr);
      }
    }

    setFacilities((prev) => prev.map((f) => (f.id === facilityId ? updated : f)));
    await recordAuditEvent(
      `Platform Admin updated tenant status of ${target.name} to ${status}`,
      '',
      '',
      facilityId
    );
  };

  // Add Staff Member to Active Facility (Admin Only)
  // Add Staff Member to Active Facility via secure server-side provisioning
  const handleAddStaffMember = async (
    name: string,
    email: string,
    role: UserRole,
    department?: string,
    temporaryPassword?: string
  ): Promise<{
    staff: UserProfile;
    credentials: {
      email: string;
      temporaryPassword: string;
      facilityId: string;
      mustChangePassword: boolean;
    };
  }> => {
    if (!currentUser) {
      throw new Error('You must be signed in to provision staff members.');
    }

    if (firebaseUser && !isSandboxMode) {
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch('/api/admin/provision-staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name,
          email,
          role,
          facilityId: activeFacility.id,
          department:
            department ||
            activeFacility.departments?.[0] ||
            'General Outpatient (GOPD)',
          temporaryPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to provision staff member.');
      }

      setStaffDirectory((prev) => {
        const filtered = prev.filter((s) => s.id !== data.staff.id);
        return [...filtered, data.staff];
      });

      await recordAuditEvent(
        `Provisioned ${role} staff account for ${name} (${email}) in ${activeFacility.name}`
      );

      return data;
    } else {
      // Sandbox / Demo Mode fallback
      const generatedPass =
        temporaryPassword && temporaryPassword.trim().length >= 8
          ? temporaryPassword.trim()
          : `CB-${Math.random().toString(36).substring(2, 7)}!9`;
      const newMember: UserProfile = {
        id: `usr_${Date.now()}`,
        ownerId: currentUser.ownerId,
        name,
        email,
        role,
        facilityId: activeFacility.id,
        department:
          department ||
          activeFacility.departments?.[0] ||
          'General Outpatient (GOPD)',
        createdAt: new Date().toISOString(),
      };
      setStaffDirectory((prev) => [...prev, newMember]);
      await recordAuditEvent(
        `Authorized ${name} (${role} · ${newMember.department}) in ${activeFacility.name}`
      );
      return {
        staff: newMember,
        credentials: {
          email,
          temporaryPassword: generatedPass,
          facilityId: activeFacility.id,
          mustChangePassword: true,
        },
      };
    }
  };

  // Render Boot Skeleton while checking Firebase Auth
  if (!authReady) {
    return <WorkspaceBootSkeleton />;
  }

  // Render Public CornerBrief Website when not authenticated
  if (!currentUser) {
    return (
      <MotionConfig reducedMotion="user">
        <LoginScreen
          facilities={facilities}
          onStaffSignIn={handleStaffSignIn}
          onDemoSignIn={handleDemoSignIn}
          onOpenRegisterFacility={(defaultType = 'Hospital') => {
            setOnboardingDefaultType(defaultType);
            setIsOnboardingModalOpen(true);
          }}
          authError={authError}
          isAuthenticating={isAuthenticating}
        />

        <FacilityOnboardingModal
          isOpen={isOnboardingModalOpen}
          initialFacilityType={onboardingDefaultType}
          onClose={() => setIsOnboardingModalOpen(false)}
          onCompleteOnboarding={handleCompleteFacilityOnboarding}
        />
      </MotionConfig>
    );
  }

  const canAccessAiWorkspace =
    currentUser.role === 'Clinician' || currentUser.role === 'Admin';
  const pendingReviewEncounters = facilityEncounters.filter(
    (e) => e.status === 'Pending Review' || e.status === 'AI Generated'
  );

  // Global Top-Bar Search Matches (Strictly Scoped to Active Facility)
  const searchNormalized = globalSearch.trim().toLowerCase();
  const matchingPatients = searchNormalized
    ? facilityPatients
        .filter(
          (p) =>
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchNormalized) ||
            p.patientId.toLowerCase().includes(searchNormalized) ||
            p.phone.toLowerCase().includes(searchNormalized)
        )
        .slice(0, 5)
    : [];

  const navItems: {
    id: AppView;
    label: string;
    icon: React.FC<{ className?: string }>;
    restricted?: boolean;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'patients',
      label: 'Patients',
      icon: Users,
      badge: facilityPatients.length,
    },
    {
      id: 'encounters',
      label: 'Encounters',
      icon: ClipboardList,
      badge: facilityEncounters.length,
    },
    {
      id: 'ai-documentation',
      label: 'AI Documentation',
      icon: Sparkles,
      restricted: !canAccessAiWorkspace,
      badge: pendingReviewEncounters.length > 0 ? pendingReviewEncounters.length : undefined,
    },
    { id: 'reports', label: 'Reports', icon: Activity },
    { id: 'settings', label: 'Facility Settings', icon: Settings },
    ...(isPlatformAdmin
      ? [
          {
            id: 'platform-admin' as const,
            label: 'Platform Admin',
            icon: ShieldCheck,
            badge: facilities.length,
          },
        ]
      : []),
  ];

  const activePatient =
    facilityPatients.find((p) => p.id === selectedPatientId) ||
    facilityPatients[0] ||
    null;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#F6F9FC] text-[#17212B] flex flex-col lg:flex-row">
        {/* Desktop Left Navigation Sidebar */}
        <aside
          className={`hidden lg:flex flex-col justify-between shrink-0 bg-[#0B1F33] text-white select-none transition-[width] duration-200 ease-out ${
            isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
          }`}
        >
          <div>
            {/* Brand Header + Collapse Button */}
            <div
              className={`h-16 px-4 border-b border-white/10 flex items-center ${
                isSidebarCollapsed ? 'justify-center' : 'justify-between'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveView('dashboard')}
                className="flex items-center text-left group focus:outline-none"
              >
                <CornerBriefLogo
                  size={isSidebarCollapsed ? 'sm' : 'sm'}
                  type={isSidebarCollapsed ? 'mark' : 'full'}
                  theme="dark"
                  badge={!isSidebarCollapsed ? 'HOSPITAL WORKSPACE' : undefined}
                />
              </button>

              {!isSidebarCollapsed && (
                <Tooltip content="Collapse sidebar" side="right">
                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="cb-icon-btn p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                    aria-label="Collapse sidebar"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </Tooltip>
              )}
            </div>

            {isSidebarCollapsed && (
              <div className="flex justify-center py-2 border-b border-white/10">
                <Tooltip content="Expand sidebar" side="right">
                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(false)}
                    className="cb-icon-btn p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                    aria-label="Expand sidebar"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>
            )}

            {/* Active Facility Tenant Switcher inside Sidebar */}
            {!isSidebarCollapsed && (
              <div className="px-3.5 pt-3.5 pb-2 border-b border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  <span>Active Facility Tenant</span>
                  <span className="text-[#0E9F9A]">
                    {activeFacility.facilityCode || 'CB-NG'}
                  </span>
                </div>
                <select
                  value={activeFacility.id}
                  onChange={(e) => handleSwitchFacility(e.target.value)}
                  aria-label="Switch healthcare facility workspace"
                  className="w-full bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#1769E0] cursor-pointer"
                >
                  {facilities.map((fac) => (
                    <option key={fac.id} value={fac.id} className="text-[#0B1F33]">
                      {fac.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setOnboardingDefaultType('Hospital');
                    setIsOnboardingModalOpen(true);
                  }}
                  className="w-full py-1 px-2 rounded-md text-[11px] font-medium text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-[#0E9F9A]" />
                  <span>Register Another Facility</span>
                </button>
              </div>
            )}

            {/* Primary Navigation Links */}
            <nav className="p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  activeView === item.id ||
                  (item.id === 'patients' && activeView === 'patient-profile') ||
                  (item.id === 'encounters' && activeView === 'new-encounter');

                const navButton = (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.restricted) {
                        setGlobalBannerError(
                          'Role Restriction: Staff accounts are restricted from the NONYE AI Documentation workspace. Switch to Clinician or Admin in Facility Settings.'
                        );
                        return;
                      }
                      setGlobalBannerError(null);
                      setActiveView(item.id);
                    }}
                    className={`relative w-full flex items-center ${
                      isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'
                    } py-2.5 rounded-lg text-xs font-medium transition-all duration-200 group cursor-pointer ${
                      isActive
                        ? 'text-white font-semibold'
                        : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                    } ${item.restricted ? 'opacity-50' : ''}`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="cb-sidebar-active-bg"
                        className="absolute inset-0 bg-[#1769E0] rounded-lg shadow-xs"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <div className="relative z-10 flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                          isActive
                            ? 'text-white scale-105'
                            : 'text-slate-400 group-hover:text-white group-hover:translate-x-0.5'
                        }`}
                      />
                      {!isSidebarCollapsed && <span>{item.label}</span>}
                    </div>
                    {!isSidebarCollapsed && item.badge !== undefined && (
                      <span
                        className={`relative z-10 font-mono text-[11px] px-1.5 py-0.5 rounded tabular-nums transition-colors duration-150 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-white/10 text-slate-300 group-hover:bg-white/15'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );

                return isSidebarCollapsed ? (
                  <Tooltip key={item.id} content={item.label} side="right">
                    {navButton}
                  </Tooltip>
                ) : (
                  navButton
                );
              })}
            </nav>
          </div>

          {/* Bottom User & Active Role Card */}
          <div className="p-3.5 border-t border-white/10 space-y-3">
            {!isSidebarCollapsed ? (
              <>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-xs font-bold text-white truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-[11px] text-slate-300 truncate mt-0.5">
                    {currentUser.department || activeFacility.name}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-[#0E9F9A] font-semibold">
                      Role: {currentUser.role}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveView('settings')}
                      className="text-slate-300 hover:text-white underline transition-colors cursor-pointer"
                    >
                      Switch
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="cb-btn w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Exit to Public Website</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Tooltip
                  content={`${currentUser.name} (${currentUser.role})`}
                  side="right"
                >
                  <button
                    type="button"
                    onClick={() => setActiveView('settings')}
                    className="w-9 h-9 rounded-lg bg-white/10 text-xs font-bold text-white flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    {currentUser.name.slice(0, 2).toUpperCase()}
                  </button>
                </Tooltip>
                <Tooltip content="Exit to Public Website" side="right">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="cb-icon-btn p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>
            )}
          </div>
        </aside>

        {/* Mobile Drawer Navigation */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-[#0B1F33]/60"
                onClick={() => setIsMobileSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-72 max-w-xs bg-[#0B1F33] text-white flex flex-col justify-between z-10"
              >
                <div>
                  <div className="h-16 px-5 border-b border-white/10 flex items-center justify-between">
                    <CornerBriefLogo
                      size="sm"
                      theme="dark"
                      badge="WORKSPACE"
                    />
                    <button
                      type="button"
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className="cb-icon-btn p-1.5 text-slate-300 hover:text-white rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Mobile Facility Switcher */}
                  <div className="p-3.5 border-b border-white/10 space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      Active Facility Tenant
                    </span>
                    <select
                      value={activeFacility.id}
                      onChange={(e) => {
                        handleSwitchFacility(e.target.value);
                        setIsMobileSidebarOpen(false);
                      }}
                      className="w-full bg-white/10 text-white border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                    >
                      {facilities.map((fac) => (
                        <option key={fac.id} value={fac.id} className="text-[#0B1F33]">
                          {fac.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <nav className="p-3 space-y-1">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeView === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (!item.restricted) {
                              setActiveView(item.id);
                              setIsMobileSidebarOpen(false);
                            }
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors duration-150 ${
                            isActive
                              ? 'bg-[#1769E0] text-white font-semibold'
                              : 'text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                <div className="p-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="cb-btn w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Exit to Public Website</span>
                  </button>
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* Main Workspace Column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar (3-Zone Header Contract: Facility Context Left, Patient Search Center, Role & Notifications Right) */}
          <header className="h-16 bg-white border-b border-[#E2E8F0] px-4 lg:px-8 flex items-center justify-between gap-4 shrink-0 sticky top-0 z-30">
            {/* Zone 1: Facility Context & Type Badge */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="cb-icon-btn lg:hidden p-2 rounded-lg text-[#64748B] hover:text-[#0B1F33] hover:bg-[#F6F9FC]"
                aria-label="Open navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#1769E0] shrink-0 hidden sm:inline" />
                  <span className="text-xs font-bold text-[#0B1F33] truncate">
                    {activeFacility.name}
                  </span>
                  <span className="hidden md:inline-block text-[10px] font-mono font-semibold text-[#1769E0] bg-[#1769E0]/10 px-2 py-0.5 rounded">
                    {activeFacility.facilityType || 'Specialist Clinic'}
                  </span>
                </div>
                <span className="hidden sm:block text-[11px] text-[#64748B] truncate">
                  {activeFacility.location}
                </span>
              </div>
            </div>

            {/* Zone 2: Global Patient Quick-Search (Scoped to Active Facility) */}
            <div ref={searchContainerRef} className="relative flex-1 max-w-md">
              <div className="relative group">
                <Search className="w-4 h-4 text-[#64748B] group-focus-within:text-[#1769E0] transition-colors duration-150 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={globalSearch}
                  onFocus={() => setIsSearchDropdownOpen(true)}
                  onChange={(e) => {
                    setGlobalSearch(e.target.value);
                    setIsSearchDropdownOpen(true);
                  }}
                  placeholder={`Search patients in ${
                    activeFacility.name.split(' ')[0]
                  } by name, ID, or phone...`}
                  className="cb-input w-full pl-9 pr-8 py-1.5 text-xs rounded-lg"
                />
                {globalSearch && (
                  <button
                    type="button"
                    onClick={() => setGlobalSearch('')}
                    className="cb-icon-btn absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#17212B] rounded-md"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <AnimatePresence>
                {isSearchDropdownOpen && searchNormalized.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.99 }}
                    transition={{ duration: 0.16 }}
                    className="absolute left-0 right-0 mt-1.5 bg-white border border-[#E2E8F0] rounded-xl shadow-lg overflow-hidden z-50"
                  >
                    {matchingPatients.length === 0 ? (
                      <div className="p-3.5 text-xs text-[#64748B] text-center">
                        No matching patients in {activeFacility.name} for &ldquo;{globalSearch}&rdquo;
                      </div>
                    ) : (
                      <div className="divide-y divide-[#E2E8F0]">
                        {matchingPatients.map((pat) => (
                          <button
                            key={pat.id}
                            type="button"
                            onClick={() => {
                              setSelectedPatientId(pat.id);
                              setActiveView('patient-profile');
                              setIsSearchDropdownOpen(false);
                              setGlobalSearch('');
                            }}
                            className="w-full px-4 py-2.5 text-left hover:bg-[#F0F6FF] transition-colors duration-150 flex items-center justify-between text-xs cursor-pointer"
                          >
                            <div>
                              <span className="font-semibold text-[#0B1F33]">
                                {pat.firstName} {pat.lastName}
                              </span>
                              <span className="text-[#64748B] ml-2 font-mono">
                                {pat.patientId}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#1769E0] font-medium">
                              Open Record →
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Zone 3: Notifications & Active Role Pill */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Pending Review Notification Bell */}
              <div ref={notificationsRef} className="relative">
                <Tooltip content="Pending clinician reviews">
                  <button
                    type="button"
                    onClick={() => setIsNotificationsOpen((prev) => !prev)}
                    className="cb-icon-btn relative p-2 rounded-lg text-[#64748B] hover:text-[#0B1F33] hover:bg-[#F6F9FC] border border-transparent hover:border-[#E2E8F0]"
                    aria-label="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {pendingReviewEncounters.length > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D97706]" />
                    )}
                  </button>
                </Tooltip>

                <AnimatePresence>
                  {isNotificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.16 }}
                      className="absolute right-0 mt-2 w-80 bg-white border border-[#E2E8F0] rounded-xl shadow-lg overflow-hidden z-50"
                    >
                      <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F6F9FC] flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0B1F33]">
                          Clinician Review Queue
                        </span>
                        <span className="font-mono text-[11px] text-[#D97706] font-semibold">
                          {pendingReviewEncounters.length} Pending
                        </span>
                      </div>
                      {pendingReviewEncounters.length === 0 ? (
                        <div className="p-4 text-xs text-[#64748B] text-center">
                          All AI-generated documentation in {activeFacility.name} has been reviewed.
                        </div>
                      ) : (
                        <div className="divide-y divide-[#E2E8F0] max-h-64 overflow-y-auto">
                          {pendingReviewEncounters.map((enc) => {
                            const pat = facilityPatients.find((p) => p.id === enc.patientId);
                            return (
                              <button
                                key={enc.id}
                                type="button"
                                onClick={() => {
                                  setIsNotificationsOpen(false);
                                  if (!canAccessAiWorkspace) {
                                    setGlobalBannerError(
                                      'Role Restriction: Switch to Clinician or Admin in Facility Settings to review AI documentation.'
                                    );
                                    return;
                                  }
                                  setSelectedEncounterId(enc.id);
                                  setSelectedPatientId(enc.patientId);
                                  setActiveView('ai-documentation');
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-[#F0F6FF] transition-colors duration-150 space-y-1 cursor-pointer"
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-[#0B1F33]">
                                    {pat
                                      ? `${pat.firstName} ${pat.lastName}`
                                      : 'Patient'}
                                  </span>
                                  <span className="font-mono text-[10px] text-[#D97706]">
                                    {enc.status}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#64748B] truncate">
                                  {enc.encounterType} · {enc.reasonForVisit}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Tooltip content="Click to switch role or configure facility">
                <button
                  type="button"
                  onClick={() => setActiveView('settings')}
                  className="cb-btn cb-btn-secondary py-1.5 px-3 rounded-lg text-xs font-medium gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-[#0E9F9A]" />
                  <span className="font-semibold text-[#0B1F33]">
                    {currentUser.name}
                  </span>
                  <span className="text-[#64748B] font-mono hidden sm:inline">
                    ({currentUser.role})
                  </span>
                </button>
              </Tooltip>
            </div>
          </header>

          {/* Optional Role/Permission Feedback Banner */}
          <AnimatePresence>
            {globalBannerError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="mx-4 lg:mx-8 mt-4 p-3.5 rounded-xl bg-[#D97706]/10 border border-[#D97706]/30 flex items-center justify-between gap-3 text-xs text-[#D97706]"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium text-[#0B1F33]">
                    {globalBannerError}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setGlobalBannerError(null)}
                  className="cb-icon-btn text-[#64748B] hover:text-[#0B1F33] p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Workspace View Container */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeFacility.id}-${activeView}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                {activeView === 'dashboard' && (
                  <DashboardView
                    currentUser={currentUser}
                    facility={activeFacility}
                    patients={facilityPatients}
                    encounters={facilityEncounters}
                    isLoading={isWorkspaceLoading}
                    onNewPatient={() => {
                      setEditingPatient(null);
                      setIsPatientModalOpen(true);
                    }}
                    onNewEncounter={(patId?: string, department?: string) => {
                      if (!canAccessAiWorkspace) {
                        setGlobalBannerError(
                          'Role Restriction: Switch to Clinician or Admin in Facility Settings to record clinical encounters.'
                        );
                        return;
                      }
                      setNewEncounterPatientId(patId || facilityPatients[0]?.id || null);
                      setNewEncounterDepartment(department || null);
                      setActiveView('new-encounter');
                    }}
                    onOpenPatient={(patId: string) => {
                      setSelectedPatientId(patId);
                      setActiveView('patient-profile');
                    }}
                    onOpenEncounter={(encId: string) => {
                      if (!canAccessAiWorkspace) {
                        setGlobalBannerError(
                          'Role Restriction: Switch to Clinician or Admin in Facility Settings to review AI documentation.'
                        );
                        return;
                      }
                      setSelectedEncounterId(encId);
                      setActiveView('ai-documentation');
                    }}
                    onNavigatePatients={() => setActiveView('patients')}
                    onNavigateEncounters={() => setActiveView('encounters')}
                  />
                )}

                {activeView === 'patients' && (
                  <PatientsView
                    currentUser={currentUser}
                    patients={facilityPatients}
                    isLoading={isWorkspaceLoading}
                    onNewPatient={() => {
                      setEditingPatient(null);
                      setIsPatientModalOpen(true);
                    }}
                    onOpenPatient={(patId: string) => {
                      setSelectedPatientId(patId);
                      setActiveView('patient-profile');
                    }}
                    onNewEncounterForPatient={(patId: string) => {
                      if (!canAccessAiWorkspace) {
                        setGlobalBannerError(
                          'Role Restriction: Switch to Clinician or Admin in Facility Settings to record clinical encounters.'
                        );
                        return;
                      }
                      setNewEncounterPatientId(patId);
                      setActiveView('new-encounter');
                    }}
                  />
                )}

                {activeView === 'patient-profile' && activePatient && (
                  <PatientProfileView
                    currentUser={currentUser}
                    patient={activePatient}
                    encounters={facilityEncounters}
                    highlightedEncounterId={highlightedTimelineEncounterId}
                    onClearHighlightedEncounter={() => setHighlightedTimelineEncounterId(null)}
                    onBack={() => setActiveView('patients')}
                    onEditPatient={(pat: Patient) => {
                      setEditingPatient(pat);
                      setIsPatientModalOpen(true);
                    }}
                    onNewEncounter={(patId: string) => {
                      setNewEncounterPatientId(patId);
                      setActiveView('new-encounter');
                    }}
                    onOpenEncounter={(encId: string) => {
                      setSelectedEncounterId(encId);
                      setActiveView('ai-documentation');
                    }}
                  />
                )}

                {activeView === 'new-encounter' && (
                  <NewEncounterView
                    currentUser={currentUser}
                    patients={facilityPatients}
                    departments={activeFacility.departments}
                    preselectedPatientId={newEncounterPatientId || selectedPatientId}
                    preselectedDepartment={newEncounterDepartment}
                    onCancel={() => setActiveView('encounters')}
                    onNewPatientRequest={() => {
                      setEditingPatient(null);
                      setIsPatientModalOpen(true);
                    }}
                    onSaveDraft={async (
                      patientId,
                      encounterDate,
                      encounterType,
                      originalInput,
                      department
                    ) => {
                      await handleCreateEncounter(
                        {
                          patientId,
                          encounterDate,
                          encounterType,
                          originalInput,
                          department,
                        },
                        false
                      );
                      return '';
                    }}
                    onCreateAndGenerateAi={async (
                      patientId,
                      encounterDate,
                      encounterType,
                      originalInput,
                      department
                    ) => {
                      await handleCreateEncounter(
                        {
                          patientId,
                          encounterDate,
                          encounterType,
                          originalInput,
                          department,
                        },
                        true
                      );
                    }}
                  />
                )}

                {activeView === 'ai-documentation' && (
                  <AiDocumentationView
                    currentUser={currentUser}
                    encounters={facilityEncounters}
                    patients={facilityPatients}
                    selectedEncounterId={selectedEncounterId}
                    externalGeneratingEncounterId={externalGeneratingEncounterId}
                    onSelectEncounter={(encId: string) => setSelectedEncounterId(encId)}
                    onGenerateAiForEncounter={handleRegenerateAiDocumentation}
                    onSaveReviewedDocumentation={handleSaveReviewedDocumentation}
                    onOpenPatient={(patId: string) => {
                      setSelectedPatientId(patId);
                      setActiveView('patient-profile');
                    }}
                    onNewEncounter={() => {
                      setNewEncounterPatientId(selectedPatientId);
                      setActiveView('new-encounter');
                    }}
                  />
                )}

                {activeView === 'encounters' && (
                  <EncountersView
                    currentUser={currentUser}
                    encounters={facilityEncounters}
                    patients={facilityPatients}
                    isLoading={isWorkspaceLoading}
                    onNewEncounter={() => {
                      setNewEncounterPatientId(selectedPatientId);
                      setActiveView('new-encounter');
                    }}
                    onOpenEncounter={(encId: string) => {
                      if (!canAccessAiWorkspace) {
                        setGlobalBannerError(
                          'Role Restriction: Switch to Clinician or Admin in Facility Settings to open the AI Documentation workspace.'
                        );
                        return;
                      }
                      setSelectedEncounterId(encId);
                      setActiveView('ai-documentation');
                    }}
                    onOpenPatient={(patId: string) => {
                      setSelectedPatientId(patId);
                      setActiveView('patient-profile');
                    }}
                  />
                )}

                {activeView === 'reports' && (
                  <ReportsView
                    currentUser={currentUser}
                    patients={facilityPatients}
                    encounters={facilityEncounters}
                    auditLogs={facilityAuditLogs}
                    onOpenPatient={(patId) => {
                      setSelectedPatientId(patId);
                      setActiveView('patient-profile');
                    }}
                    onOpenEncounter={(encId) => {
                      setSelectedEncounterId(encId);
                      setActiveView('ai-documentation');
                    }}
                  />
                )}

                {activeView === 'settings' && (
                  <SettingsView
                    currentUser={currentUser}
                    facility={activeFacility}
                    staffDirectory={facilityStaff}
                    onUpdateFacility={handleUpdateFacility}
                    onAddStaffMember={handleAddStaffMember}
                  />
                )}

                {activeView === 'platform-admin' && isPlatformAdmin && (
                  <PlatformAdminView
                    facilities={facilities}
                    activeFacilityId={activeFacility.id}
                    allPatients={patients}
                    allEncounters={encounters}
                    allStaff={staffDirectory}
                    allAuditLogs={auditLogs}
                    onSwitchFacility={handleSwitchFacility}
                    onUpdateFacilityStatus={handleUpdateFacilityStatus}
                    onOpenRegisterFacility={() => {
                      setOnboardingDefaultType('Hospital');
                      setIsOnboardingModalOpen(true);
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        {/* Patient Registration & Edit Modal */}
        <PatientModal
          isOpen={isPatientModalOpen}
          initialPatient={editingPatient}
          existingPatientsCount={facilityPatients.length}
          onClose={() => {
            setIsPatientModalOpen(false);
            setEditingPatient(null);
          }}
          onSave={async (patientData) => {
            await handleSavePatient(patientData, editingPatient?.id);
          }}
        />

        {/* Facility Registration & Onboarding Modal */}
        <FacilityOnboardingModal
          isOpen={isOnboardingModalOpen}
          initialFacilityType={onboardingDefaultType}
          onClose={() => setIsOnboardingModalOpen(false)}
          onCompleteOnboarding={handleCompleteFacilityOnboarding}
        />
      </div>
    </MotionConfig>
  );
}
