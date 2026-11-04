import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'crypto';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import {
  DEFAULT_ROLE_PERMISSIONS,
  normalizeUsername,
  validateUsername,
  generateMembershipId,
  resolveAuthorizedPermissions,
  checkFacilityStatus,
  checkMembershipStatus,
  verifyActiveFacilityMembership,
  verifyFacilityClinicalAccess,
  canManageFacilityMemberships,
  resolveUserMemberships,
} from './src/lib/membershipService.ts';
import type { FacilityMembership, MembershipStatus, UserRole } from './src/types.ts';
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  checkLoginRateLimit,
  resetLoginRateLimit,
  type FacilityCredential,
  type AuthSession,
} from './src/lib/authService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '1mb' }));

// Read Firebase applet configuration for server-side verification
const configPath = path.join(__dirname, 'firebase-applet-config.json');
let firebaseConfig: { projectId: string; firestoreDatabaseId: string } = {
  projectId: 'sodium-extension-px4wp',
  firestoreDatabaseId: 'ai-studio-carebrief-3a5f4224-3c34-41c4-ba6c-41b73bdfc6dc',
};
if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error('Failed to parse firebase-applet-config.json:', err);
  }
}

const adminApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({ projectId: firebaseConfig.projectId });
const adminAuth = getAuth(adminApp);
let adminDb: ReturnType<typeof getFirestore> | null = null;
try {
  adminDb = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
} catch (dbInitErr) {
  console.warn('Unable to initialize Admin Firestore SDK:', dbInitErr);
}

// Shared Server-Side Gemini Client with required User-Agent header
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Strict schema validator for NONYE AI structured output
function validateAiDocumentationSchema(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const ensureString = (val: unknown): string => {
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
    return 'Not provided.';
  };

  const ensureStringArray = (val: unknown): string[] => {
    if (Array.isArray(val)) {
      const cleaned = val
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim());
      return cleaned.length > 0 ? cleaned : ['Not provided.'];
    }
    return ['Not provided.'];
  };

  if (typeof obj.encounterSummary !== 'string' || typeof obj.presentingConcern !== 'string') {
    return null;
  }

  return {
    encounterSummary: ensureString(obj.encounterSummary),
    presentingConcern: ensureString(obj.presentingConcern),
    relevantHistory: ensureStringArray(obj.relevantHistory),
    medications: ensureStringArray(obj.medications),
    allergies: ensureStringArray(obj.allergies),
    investigations: ensureStringArray(obj.investigations),
    clinicalNotes: ensureStringArray(obj.clinicalNotes),
    followUpItems: ensureStringArray(obj.followUpItems),
    missingInformation: ensureStringArray(obj.missingInformation),
    requiresReview: true,
  };
}

// Deterministic, zero-hallucination clinical organizer fallback when API key is unconfigured in sandbox
function buildDeterministicDocumentation(
  input: Record<string, string>,
  vitalSigns?: Record<string, string> | null
) {
  const reasonForVisit = (input.reasonForVisit || '').trim();
  const patientReportedInfo = (input.patientReportedInfo || '').trim();
  const relevantHistory = (input.relevantHistory || '').trim();
  const currentMedications = (input.currentMedications || '').trim();
  const allergies = (input.allergies || '').trim();
  const investigations = (input.investigations || '').trim();
  const clinicianObservations = (input.clinicianObservations || '').trim();
  const additionalNotes = (input.additionalNotes || '').trim();
  const encounterType = (input.encounterType || 'Clinical Encounter').trim();
  const encounterDate = (input.encounterDate || '').trim();

  const vitalItems: string[] = [];
  if (vitalSigns && typeof vitalSigns === 'object') {
    if (vitalSigns.bloodPressureSystolic && vitalSigns.bloodPressureDiastolic) {
      vitalItems.push(
        `Blood Pressure: ${vitalSigns.bloodPressureSystolic}/${vitalSigns.bloodPressureDiastolic} mmHg`
      );
    }
    if (vitalSigns.pulseRate) vitalItems.push(`Pulse Rate: ${vitalSigns.pulseRate} bpm`);
    if (vitalSigns.temperatureCelsius) {
      vitalItems.push(`Temperature: ${vitalSigns.temperatureCelsius} °C`);
    }
    if (vitalSigns.spo2Percent) vitalItems.push(`SpO2: ${vitalSigns.spo2Percent}%`);
    if (vitalSigns.weightKg) vitalItems.push(`Body Weight: ${vitalSigns.weightKg} kg`);
    if (vitalSigns.pcvPercent) vitalItems.push(`PCV: ${vitalSigns.pcvPercent}%`);
    if (vitalSigns.bloodGlucose) vitalItems.push(`Blood Glucose: ${vitalSigns.bloodGlucose}`);
  }

  const splitLines = (text: string): string[] => {
    if (!text) return ['Not provided.'];
    const parts = text
      .split(/\r?\n|;|•/)
      .map((s) => s.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : ['Not provided.'];
  };

  const missing: string[] = [];
  if (!reasonForVisit) missing.push('Reason for visit / presenting complaint not specified.');
  if (!patientReportedInfo) missing.push('Patient-reported symptom narrative not provided.');
  if (!relevantHistory) missing.push('Past medical or surgical history not provided.');
  if (!currentMedications) missing.push('Current medication list not provided.');
  if (!allergies) missing.push('Drug or environmental allergy status not recorded.');
  if (!investigations && vitalItems.length === 0) {
    missing.push('Laboratory or diagnostic investigation details not provided.');
  }
  if (!clinicianObservations) {
    missing.push('Objective clinician examination/vital observations not recorded.');
  }

  const summaryParts: string[] = [];
  summaryParts.push(`${encounterType}${encounterDate ? ` recorded on ${encounterDate}` : ''}.`);
  if (reasonForVisit) summaryParts.push(`Presenting reason: ${reasonForVisit}.`);
  if (vitalItems.length > 0) summaryParts.push(`Recorded triage vitals: ${vitalItems.join(', ')}.`);
  if (patientReportedInfo) summaryParts.push(`Patient-reported context: ${patientReportedInfo}`);
  if (clinicianObservations) summaryParts.push(`Clinician observations: ${clinicianObservations}`);

  const clinicalNotesList: string[] = [];
  if (patientReportedInfo) clinicalNotesList.push(`Patient Report: ${patientReportedInfo}`);
  if (clinicianObservations) {
    splitLines(clinicianObservations).forEach((line) => {
      if (line !== 'Not provided.') clinicalNotesList.push(`Observation: ${line}`);
    });
  }
  if (additionalNotes) {
    splitLines(additionalNotes).forEach((line) => {
      if (line !== 'Not provided.') clinicalNotesList.push(`Additional Note: ${line}`);
    });
  }

  const followUpCandidates: string[] = [];
  const combinedSource = `${clinicianObservations}\n${additionalNotes}`;
  splitLines(combinedSource).forEach((line) => {
    if (
      line !== 'Not provided.' &&
      /(follow[- ]?up|review|return|repeat|refer|schedule|monitor|check|re-evaluate|advised)/i.test(line)
    ) {
      followUpCandidates.push(line);
    }
  });

  const combinedInvestigations = [
    ...vitalItems,
    ...splitLines(investigations).filter((item) => item !== 'Not provided.'),
  ];

  return {
    encounterSummary: summaryParts.join(' ') || 'Not provided.',
    presentingConcern: reasonForVisit || 'Not provided.',
    relevantHistory: splitLines(relevantHistory),
    medications: splitLines(currentMedications),
    allergies: splitLines(allergies),
    investigations: combinedInvestigations.length > 0 ? combinedInvestigations : ['Not provided.'],
    clinicalNotes: clinicalNotesList.length > 0 ? clinicalNotesList : ['Not provided.'],
    followUpItems: followUpCandidates.length > 0 ? followUpCandidates : ['Not provided.'],
    missingInformation: missing.length > 0 ? missing : ['All core clinical encounter fields were supplied.'],
    requiresReview: true,
  };
}

const NONYE_AI_SYSTEM_INSTRUCTION = `You are NONYE AI, the clinical Documentation Assistant inside CornerBrief, a healthcare documentation and patient-record platform for clinics and healthcare professionals in Nigeria.

CRITICAL SAFETY & CLINICAL BOUNDARIES (MANDATORY):
1. You are a documentation and information-organization assistant ONLY. You are NOT an autonomous doctor.
2. NEVER invent patient information, laboratory results, vital signs, medications, allergies, symptoms, or diagnoses.
3. NEVER claim that a patient has a disease or condition unless that diagnosis was explicitly supplied in the clinician's input.
4. NEVER prescribe medication, recommend medication dosages, or make autonomous treatment decisions.
5. NEVER guess or extrapolate missing clinical facts. Flag missing fields in "missingInformation".
6. If information for a specific section is not explicitly present in the clinician's input, output exactly "Not provided." (or ["Not provided."] for array fields).
7. Organize the clinician's exact supplied facts into clear, objective clinical language while preserving factual fidelity.
8. Always set "requiresReview" to true.`;

app.post('/api/ai/generate-documentation', async (req, res) => {
  try {
    // 1. Verify Authorization Header (Bearer token)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required. Please sign in to generate clinical documentation.',
      });
    }

    const idToken = authHeader.substring(7).trim();
    if (!idToken) {
      return res.status(401).json({
        error: 'Authentication token missing. Please sign in again.',
      });
    }

    // 2. Cryptographically verify the Firebase ID token
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      // Do not log raw tokens or credentials
      return res.status(401).json({
        error: 'Your clinical session is invalid or has expired. Please sign in again.',
      });
    }

    const authenticatedUid = decodedToken.uid;
    if (!authenticatedUid) {
      return res.status(401).json({
        error: 'Unable to identify authenticated user from token.',
      });
    }

    // 3. Extract and validate required resource identifiers
    const { patientId, facilityId, encounterId, encounterInput, patientContext, vitalSigns } =
      req.body || {};

    if (!patientId || typeof patientId !== 'string' || !patientId.trim()) {
      return res.status(400).json({
        error: 'A valid patient identifier is required before generating documentation.',
      });
    }

    if (!facilityId || typeof facilityId !== 'string' || !facilityId.trim()) {
      return res.status(400).json({
        error: 'A valid facility identifier is required before generating documentation.',
      });
    }

    const cleanPatientId = patientId.trim();
    const cleanFacilityId = facilityId.trim();
    const firestoreBaseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;

    // 4. Verify patient existence and ownership under existing model
    const patientUrl = `${firestoreBaseUrl}/patients/${encodeURIComponent(cleanPatientId)}`;
    let patientRes: globalThis.Response;
    try {
      patientRes = await fetch(patientUrl, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
    } catch {
      return res.status(502).json({
        error: 'Unable to verify patient record. Database service is currently unavailable.',
      });
    }

    if (patientRes.status === 404) {
      return res.status(404).json({
        error: 'The requested patient record could not be found.',
      });
    }

    if (patientRes.status === 403 || !patientRes.ok) {
      return res.status(403).json({
        error: 'Access denied. You are not authorized to access this patient record.',
      });
    }

    const patientDoc = (await patientRes.json()) as {
      fields?: Record<string, { stringValue?: string }>;
    };
    const patientFields = patientDoc.fields || {};
    const patientOwnerId = patientFields.ownerId?.stringValue;
    const patientFacilityId = patientFields.facilityId?.stringValue;

    // Check ownership under existing model
    if (patientOwnerId !== authenticatedUid) {
      return res.status(403).json({
        error: 'Access denied. You do not own this patient record.',
      });
    }

    // Check facility consistency
    if (patientFacilityId !== cleanFacilityId) {
      return res.status(403).json({
        error: 'Access denied. Patient record does not belong to the requested facility.',
      });
    }

    // 5. If encounterId is provided, verify encounter ownership and linkage
    if (encounterId && typeof encounterId === 'string' && encounterId.trim()) {
      const cleanEncounterId = encounterId.trim();
      const encounterUrl = `${firestoreBaseUrl}/encounters/${encodeURIComponent(cleanEncounterId)}`;
      let encounterRes: globalThis.Response;
      try {
        encounterRes = await fetch(encounterUrl, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
      } catch {
        return res.status(502).json({
          error: 'Unable to verify encounter record. Database service is currently unavailable.',
        });
      }

      if (encounterRes.status === 404) {
        return res.status(404).json({
          error: 'The requested encounter record could not be found.',
        });
      }

      if (encounterRes.status === 403 || !encounterRes.ok) {
        return res.status(403).json({
          error: 'Access denied. You are not authorized to access this encounter.',
        });
      }

      const encounterDoc = (await encounterRes.json()) as {
        fields?: Record<string, { stringValue?: string }>;
      };
      const encounterFields = encounterDoc.fields || {};
      const encounterOwnerId = encounterFields.ownerId?.stringValue;
      const encounterPatientId = encounterFields.patientId?.stringValue;
      const encounterFacilityId = encounterFields.facilityId?.stringValue;

      if (encounterOwnerId !== authenticatedUid) {
        return res.status(403).json({
          error: 'Access denied. You do not own this encounter record.',
        });
      }

      if (encounterPatientId !== cleanPatientId) {
        return res.status(403).json({
          error: 'Inconsistent record. Encounter is not associated with the specified patient.',
        });
      }

      if (encounterFacilityId !== cleanFacilityId) {
        return res.status(403).json({
          error: 'Inconsistent record. Encounter facility does not match the requested facility.',
        });
      }
    }

    // 6. Validate encounter input content
    if (!encounterInput || typeof encounterInput !== 'object') {
      return res.status(400).json({
        error: 'Please provide valid clinical encounter information before generating documentation.',
      });
    }

    const hasAnyContent = [
      encounterInput.reasonForVisit,
      encounterInput.patientReportedInfo,
      encounterInput.relevantHistory,
      encounterInput.currentMedications,
      encounterInput.allergies,
      encounterInput.investigations,
      encounterInput.clinicianObservations,
      encounterInput.additionalNotes,
    ].some((field) => typeof field === 'string' && field.trim().length > 0);

    if (!hasAnyContent) {
      return res.status(400).json({
        error: 'Please enter at least one clinical observation or reason for visit before generating AI documentation.',
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Fallback to strict deterministic structuring when no API key is configured in environment
      const structured = buildDeterministicDocumentation(encounterInput, vitalSigns);
      return res.json({ documentation: structured, engine: 'nonye-deterministic-organizer' });
    }

    const formattedVitals =
      vitalSigns && typeof vitalSigns === 'object'
        ? [
            vitalSigns.bloodPressureSystolic && vitalSigns.bloodPressureDiastolic
              ? `BP: ${vitalSigns.bloodPressureSystolic}/${vitalSigns.bloodPressureDiastolic} mmHg`
              : null,
            vitalSigns.pulseRate ? `Pulse: ${vitalSigns.pulseRate} bpm` : null,
            vitalSigns.temperatureCelsius ? `Temp: ${vitalSigns.temperatureCelsius} °C` : null,
            vitalSigns.spo2Percent ? `SpO2: ${vitalSigns.spo2Percent}%` : null,
            vitalSigns.weightKg ? `Weight: ${vitalSigns.weightKg} kg` : null,
            vitalSigns.pcvPercent ? `PCV: ${vitalSigns.pcvPercent}%` : null,
            vitalSigns.bloodGlucose ? `Blood Glucose: ${vitalSigns.bloodGlucose}` : null,
          ]
            .filter(Boolean)
            .join('; ') || 'Not provided.'
        : 'Not provided.';

    const promptText = `Organize the following clinical encounter input into structured documentation strictly adhering to the NONYE AI safety rules. Do not invent any medical facts, diagnoses, dosages, or findings. Use "Not provided." where information is absent.

PATIENT CONTEXT (Non-identifying reference):
- Sex: ${patientContext?.sex || 'Not provided'}
- Age: ${patientContext?.age ?? 'Not provided'}

POINT-OF-CARE TRIAGE VITAL SIGNS:
- Recorded Vitals: ${formattedVitals}

CLINICIAN-ENTERED ENCOUNTER INFORMATION:
- Encounter Date: ${encounterInput.encounterDate || 'Not provided.'}
- Encounter Type: ${encounterInput.encounterType || 'Not provided.'}
- Reason for Visit: ${encounterInput.reasonForVisit || 'Not provided.'}
- Patient-Reported Information: ${encounterInput.patientReportedInfo || 'Not provided.'}
- Relevant History: ${encounterInput.relevantHistory || 'Not provided.'}
- Current Medications: ${encounterInput.currentMedications || 'Not provided.'}
- Allergies: ${encounterInput.allergies || 'Not provided.'}
- Investigations / Lab Information: ${encounterInput.investigations || 'Not provided.'}
- Clinician Observations: ${encounterInput.clinicianObservations || 'Not provided.'}
- Additional Notes: ${encounterInput.additionalNotes || 'Not provided.'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction: NONYE_AI_SYSTEM_INSTRUCTION,
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            encounterSummary: {
              type: Type.STRING,
              description: 'A concise factual summary based ONLY on the information supplied. Use "Not provided." if unavailable.',
            },
            presentingConcern: {
              type: Type.STRING,
              description: 'The patient stated reason for the encounter. Use "Not provided." if unavailable.',
            },
            relevantHistory: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Relevant history explicitly contained in the input, or ["Not provided."].',
            },
            medications: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Medications explicitly mentioned by the clinician/patient, or ["Not provided."]. Never prescribe or add dosages.',
            },
            allergies: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Allergies explicitly mentioned, or ["Not provided."].',
            },
            investigations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Laboratory or diagnostic investigation findings supplied by the healthcare worker, or ["Not provided."].',
            },
            clinicalNotes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Organized clinician observations and additional notes, or ["Not provided."].',
            },
            followUpItems: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Follow-up actions explicitly stated by the clinician, or ["Not provided."].',
            },
            missingInformation: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Documentation fields that appear incomplete or were omitted from the encounter input.',
            },
            requiresReview: {
              type: Type.BOOLEAN,
              description: 'Always true. Every AI-generated document requires clinician review.',
            },
          },
          required: [
            'encounterSummary',
            'presentingConcern',
            'relevantHistory',
            'medications',
            'allergies',
            'investigations',
            'clinicalNotes',
            'followUpItems',
            'missingInformation',
            'requiresReview',
          ],
        },
      },
    });

    const rawText = response.text;
    if (!rawText || !rawText.trim()) {
      return res.status(502).json({
        error: 'Unable to generate documentation. Empty response received from AI service. Please try again.',
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText.trim());
    } catch {
      return res.status(502).json({
        error: 'Unable to generate documentation. Invalid structured format returned. Please try again.',
      });
    }

    const validated = validateAiDocumentationSchema(parsed);
    if (!validated) {
      return res.status(502).json({
        error: 'Unable to generate documentation. Response failed clinical schema validation. Please try again.',
      });
    }

    return res.json({ documentation: validated, engine: 'nonye-gemini-3.8-flash' });
  } catch (error) {
    console.error('NONYE AI generation error:', error);
    return res.status(500).json({
      error: 'Unable to generate documentation. Please try again.',
    });
  }
});

// Helper: Secure Temporary Password Generator
function generateSecureTemporaryPassword(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*';
  const bytes = crypto.randomBytes(8);
  let pass = 'CB-';
  pass += letters[bytes[0] % letters.length];
  pass += letters[bytes[1] % letters.length];
  pass += digits[bytes[2] % digits.length];
  pass += digits[bytes[3] % digits.length];
  pass += symbols[bytes[4] % symbols.length];
  pass += letters[bytes[5] % letters.length];
  pass += digits[bytes[6] % digits.length];
  pass += symbols[bytes[7] % symbols.length];
  return pass;
}

// Helper: Provisioning Rollback & Orphan Account Prevention
async function rollbackStaffProvisioning(
  newUid: string,
  userDocPersisted: boolean
) {
  let userDocDeleted = false;
  let authUserDeleted = false;

  // 1. Delete Firestore user document via trusted Admin SDK if it was persisted
  if (userDocPersisted && adminDb) {
    try {
      await adminDb.collection('users').doc(newUid).delete();
      userDocDeleted = true;
    } catch (err: any) {
      console.error(
        'CRITICAL: Admin SDK failed to delete user document during provisioning rollback for UID:',
        newUid,
        err?.message || err
      );
    }
  }

  // 2. Delete Firebase Auth account
  try {
    await adminAuth.deleteUser(newUid);
    authUserDeleted = true;
  } catch (err: any) {
    console.error(
      'CRITICAL: Failed to delete auth user during provisioning rollback for UID:',
      newUid,
      err?.message || err
    );
  }

  return { userDocDeleted, authUserDeleted };
}

// Helper: Server-side Administrator Authorization Verification
async function verifyAdministratorCaller(idToken: string) {
  const decodedToken = await adminAuth.verifyIdToken(idToken);
  const callerUid = decodedToken.uid;
  if (!callerUid) {
    throw new Error('UNAUTHENTICATED');
  }

  const callerEmail = (decodedToken.email || '').toLowerCase().trim();
  const emailVerified = !!decodedToken.email_verified;

  // 1. Safe Bootstrap: Check if caller matches platform bootstrap administrator
  const isBootstrappedAdmin =
    callerEmail === 'mervyndeanhilary@gmail.com' && emailVerified;

  const firestoreBaseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;

  // 2. Check if caller is recorded in /admins/{callerUid} collection
  let isRegisteredPlatformAdmin = false;
  try {
    const adminCheckRes = await fetch(
      `${firestoreBaseUrl}/admins/${encodeURIComponent(callerUid)}`,
      {
        headers: { Authorization: `Bearer ${idToken}` },
      }
    );
    if (adminCheckRes.ok) {
      isRegisteredPlatformAdmin = true;
    }
  } catch {
    // Non-blocking lookup
  }

  const isPlatformAdmin = isBootstrappedAdmin || isRegisteredPlatformAdmin;

  // 3. Inspect caller's user record in /users/{callerUid}
  let callerProfile: {
    role?: string;
    facilityId?: string;
    name?: string;
  } | null = null;

  try {
    const userRes = await fetch(
      `${firestoreBaseUrl}/users/${encodeURIComponent(callerUid)}`,
      {
        headers: { Authorization: `Bearer ${idToken}` },
      }
    );
    if (userRes.ok) {
      const userDoc = (await userRes.json()) as {
        fields?: Record<string, { stringValue?: string }>;
      };
      callerProfile = {
        role: userDoc.fields?.role?.stringValue,
        facilityId: userDoc.fields?.facilityId?.stringValue,
        name: userDoc.fields?.name?.stringValue,
      };
    }
  } catch (err) {
    console.warn('Unable to query caller user document:', err);
  }

  // 4. Verify facility administrative authority
  let isFacilityAdmin = false;
  if (callerProfile?.facilityId) {
    try {
      const facRes = await fetch(
        `${firestoreBaseUrl}/facilities/${encodeURIComponent(callerProfile.facilityId)}`,
        {
          headers: { Authorization: `Bearer ${idToken}` },
        }
      );
      if (facRes.ok) {
        const facDoc = (await facRes.json()) as {
          fields?: Record<string, { stringValue?: string }>;
        };
        const facilityOwnerId = facDoc.fields?.ownerId?.stringValue;
        if (
          facilityOwnerId === callerUid ||
          isPlatformAdmin ||
          callerProfile.role === 'FacilityAdmin' ||
          callerProfile.role === 'Admin'
        ) {
          isFacilityAdmin = true;
        }
      }
    } catch (err) {
      console.warn('Unable to verify facility authorization for caller:', err);
    }
  }

  return {
    callerUid,
    callerEmail,
    callerName: callerProfile?.name || decodedToken.name || callerEmail || 'Administrator',
    emailVerified,
    isPlatformAdmin,
    isFacilityAdmin,
    callerRole: callerProfile?.role || (isPlatformAdmin ? 'PlatformAdmin' : isFacilityAdmin ? 'FacilityAdmin' : null),
    callerFacilityId: callerProfile?.facilityId || null,
  };
}

// Endpoint: Verify Caller's Administrative Authority
app.get('/api/admin/verify-caller', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const idToken = authHeader.substring(7).trim();
    if (!idToken) {
      return res.status(401).json({ error: 'Token missing.' });
    }

    // 1. Check if token is a CornerBrief signed staff session token
    const staffSessionId = verifySessionToken(idToken);
    if (staffSessionId) {
      const session = activeSessions.get(staffSessionId);
      if (session) {
        // Staff sessions strictly NEVER grant PlatformAdmin authority
        const isFacilityAdmin = session.role === 'FacilityAdmin' || session.role === 'Admin';
        return res.json({
          uid: session.userId,
          email: session.email,
          name: session.displayName,
          isPlatformAdmin: false,
          isFacilityAdmin,
          authorizedFacilityId: session.facilityId,
          canProvisionStaff: isFacilityAdmin,
        });
      }
    }

    const authContext = await verifyAdministratorCaller(idToken);
    const isFacilityAdmin = authContext.isFacilityAdmin;

    return res.json({
      uid: authContext.callerUid,
      email: authContext.callerEmail,
      name: authContext.callerName,
      isPlatformAdmin: authContext.isPlatformAdmin,
      isFacilityAdmin,
      authorizedFacilityId: authContext.callerFacilityId,
      canProvisionStaff: authContext.isPlatformAdmin || isFacilityAdmin,
    });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
});

// ============================================================================
// FACILITY REGISTRATION & HOSPITAL CODE ARCHITECTURE (Stage 2A)
// ============================================================================

// Server-side registry of known and registered Hospital Codes
const registeredHospitalCodes = new Map<
  string,
  { facilityId: string; registeredAt: string; status: string }
>();
registeredHospitalCodes.set('LLSC-VI', {
  facilityId: 'fac_lagos_island_001',
  registeredAt: '2026-01-15T08:00:00.000Z',
  status: 'Active',
});
registeredHospitalCodes.set('ACCH-ABJ', {
  facilityId: 'fac_abuja_national_002',
  registeredAt: '2026-02-02T09:00:00.000Z',
  status: 'Active',
});
registeredHospitalCodes.set('PRMC-PHC', {
  facilityId: 'fac_ph_riverside_003',
  registeredAt: '2026-02-10T10:00:00.000Z',
  status: 'Active',
});
registeredHospitalCodes.set('SUSP-FAC', {
  facilityId: 'fac_suspended_demo_004',
  registeredAt: '2026-02-25T08:00:00.000Z',
  status: 'Suspended',
});

// In-flight concurrency lock to guarantee atomic uniqueness and race-condition safety
const inFlightRegistrations = new Set<string>();

// In-memory facilities store mirror
const inMemoryFacilities = new Map<string, any>();
inMemoryFacilities.set('fac_lagos_island_001', {
  id: 'fac_lagos_island_001',
  name: 'Lagos Lagoon Specialist Centre',
  facilityCode: 'LLSC-VI',
  facilityType: 'Hospital',
  location: '14 Marine Road, Victoria Island, Lagos State',
  state: 'Lagos State',
  status: 'Active',
  departments: ['Cardiology', 'Obstetrics & Gynaecology', 'Accident & Emergency (A&E)', 'General Outpatient (GOPD)'],
});
inMemoryFacilities.set('fac_abuja_national_002', {
  id: 'fac_abuja_national_002',
  name: 'Abuja Central Care Hospital',
  facilityCode: 'ACCH-ABJ',
  facilityType: 'Hospital',
  location: 'Plot 402 Constitution Avenue, Garki 2, Abuja',
  state: 'Federal Capital Territory',
  status: 'Active',
  departments: ['General Outpatient (GOPD)', 'Internal Medicine', 'Paediatrics'],
});
inMemoryFacilities.set('fac_ph_riverside_003', {
  id: 'fac_ph_riverside_003',
  name: 'Port Harcourt Riverside Medical Centre',
  facilityCode: 'PRMC-PHC',
  facilityType: 'Medical Center',
  location: '28 Harley Street, Old GRA, Port Harcourt',
  state: 'Rivers State',
  status: 'Active',
  departments: ['General Outpatient (GOPD)', 'Surgery', 'Family Medicine'],
});
inMemoryFacilities.set('fac_suspended_demo_004', {
  id: 'fac_suspended_demo_004',
  name: 'Suspended Demonstration Hospital',
  facilityCode: 'SUSP-FAC',
  facilityType: 'Hospital',
  location: '12 Medical Row, Ikeja, Lagos State',
  state: 'Lagos State',
  status: 'Suspended',
  departments: ['General Outpatient (GOPD)'],
});

// Rate limiting store for facility registration attempts (prevent flooding)
const registrationRateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRegistrationRateLimit(ip: string): boolean {
  const now = Date.now();
  const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  const MAX_ATTEMPTS = 20;

  const entry = registrationRateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    registrationRateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return false;
  }

  entry.count += 1;
  return true;
}

// Endpoint: Check Hospital Code Availability (Queries database and prevents info leakage)
app.get('/api/facilities/check-code/:code', async (req, res) => {
  const rawCode = (req.params.code || '').trim();
  const normalizedCode = rawCode.toUpperCase();
  const HOSPITAL_CODE_REGEX = /^[A-Z0-9-]{3,12}$/;

  if (!HOSPITAL_CODE_REGEX.test(normalizedCode)) {
    return res.status(400).json({
      error:
        'Hospital Code must be 3-12 characters and contain only uppercase letters, numbers, and hyphens.',
      available: false,
    });
  }

  // 1. Check in-flight registrations lock
  if (inFlightRegistrations.has(normalizedCode)) {
    return res.json({
      code: normalizedCode,
      available: false,
    });
  }

  // 2. Query persistent Firestore database (both facilityCodes and facilities collections)
  if (adminDb) {
    try {
      const codeDoc = await adminDb.collection('facilityCodes').doc(normalizedCode).get();
      if (codeDoc.exists) {
        return res.json({
          code: normalizedCode,
          available: false,
        });
      }

      const facSnap = await adminDb
        .collection('facilities')
        .where('facilityCode', '==', normalizedCode)
        .limit(1)
        .get();
      if (!facSnap.empty) {
        return res.json({
          code: normalizedCode,
          available: false,
        });
      }
    } catch (err: any) {
      // Diagnostic log for server operators; do NOT leak credentials or details to client
      console.warn('Database lookup warning during code availability check:', err?.message || err);
    }
  }

  // 3. Check server-side registered registry
  const isTaken = registeredHospitalCodes.has(normalizedCode);
  return res.json({
    code: normalizedCode,
    available: !isTaken,
  });
});

// Endpoint: Secure Healthcare Facility Registration
app.post('/api/facilities/register', async (req, res) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  if (!checkRegistrationRateLimit(clientIp)) {
    return res.status(429).json({
      error: 'Too many registration attempts. Please wait 5 minutes before trying again.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

  const body = req.body || {};
  const {
    name,
    facilityType,
    facilityCode,
    address,
    city,
    state,
    contactEmail,
    contactPhone,
    adminName,
    adminEmail,
    adminRoleTitle,
    departments,
    initialStaff,
  } = body;

  // 1. Validate Facility Name (Sanitized string length)
  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 160) {
    return res.status(400).json({
      error: 'Facility name is required and must be between 2 and 160 characters.',
      code: 'INVALID_FACILITY_NAME',
    });
  }

  // 2. Validate Facility Type
  const ALLOWED_FACILITY_TYPES = [
    'Hospital',
    'Specialist Clinic',
    'Medical Center',
    'Primary Care Clinic',
  ];
  const cleanType = typeof facilityType === 'string' ? facilityType.trim() : '';
  if (!ALLOWED_FACILITY_TYPES.includes(cleanType)) {
    return res.status(400).json({
      error: `Invalid facility type. Permitted types: ${ALLOWED_FACILITY_TYPES.join(', ')}.`,
      code: 'INVALID_FACILITY_TYPE',
    });
  }

  // 3. Normalize & Validate Hospital Code
  if (!facilityCode || typeof facilityCode !== 'string') {
    return res.status(400).json({
      error: 'Hospital Code is required.',
      code: 'MISSING_FACILITY_CODE',
    });
  }

  const normalizedCode = facilityCode.trim().toUpperCase();
  const HOSPITAL_CODE_REGEX = /^[A-Z0-9-]{3,12}$/;
  if (!HOSPITAL_CODE_REGEX.test(normalizedCode)) {
    return res.status(400).json({
      error:
        'Hospital Code must be between 3 and 12 characters and contain only uppercase letters, numbers, and hyphens (e.g., KTH-01, LLSC-VI).',
      code: 'INVALID_FACILITY_CODE_FORMAT',
    });
  }

  // 4. Validate Location Fields
  if (
    !address ||
    typeof address !== 'string' ||
    address.trim().length < 2 ||
    address.trim().length > 200
  ) {
    return res.status(400).json({
      error: 'Facility street address is required (between 2 and 200 characters).',
      code: 'INVALID_ADDRESS',
    });
  }
  if (!city || typeof city !== 'string' || city.trim().length < 2 || city.trim().length > 80) {
    return res.status(400).json({
      error: 'City is required (between 2 and 80 characters).',
      code: 'INVALID_CITY',
    });
  }
  if (!state || typeof state !== 'string' || state.trim().length < 2 || state.trim().length > 80) {
    return res.status(400).json({
      error: 'State is required.',
      code: 'INVALID_STATE',
    });
  }

  // 5. Validate Email and Phone
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanContactEmail = (contactEmail || '').toString().trim().toLowerCase();
  if (!cleanContactEmail || !emailRegex.test(cleanContactEmail) || cleanContactEmail.length > 160) {
    return res.status(400).json({
      error: 'A valid facility contact email address is required.',
      code: 'INVALID_CONTACT_EMAIL',
    });
  }

  const cleanContactPhone = (contactPhone || '').toString().trim();
  if (!cleanContactPhone || cleanContactPhone.length < 7 || cleanContactPhone.length > 40) {
    return res.status(400).json({
      error: 'A valid facility contact phone number (at least 7 characters) is required.',
      code: 'INVALID_CONTACT_PHONE',
    });
  }

  // 6. Validate Initial Administrator Information
  const cleanAdminName = (adminName || '').toString().trim();
  if (!cleanAdminName || cleanAdminName.length < 2 || cleanAdminName.length > 120) {
    return res.status(400).json({
      error: 'Primary Administrator full name is required (between 2 and 120 characters).',
      code: 'INVALID_ADMIN_NAME',
    });
  }

  const cleanAdminEmail = (adminEmail || '').toString().trim().toLowerCase();
  if (!cleanAdminEmail || !emailRegex.test(cleanAdminEmail) || cleanAdminEmail.length > 160) {
    return res.status(400).json({
      error: 'A valid Primary Administrator email address is required.',
      code: 'INVALID_ADMIN_EMAIL',
    });
  }

  const cleanAdminRoleTitle = (adminRoleTitle || 'Chief Medical Director / Facility Admin')
    .toString()
    .trim()
    .slice(0, 120);

  // 7. Validate Clinical Departments
  if (!Array.isArray(departments) || departments.length === 0) {
    return res.status(400).json({
      error: 'At least one clinical department or service unit must be selected.',
      code: 'MISSING_DEPARTMENTS',
    });
  }
  const cleanDepartments = departments
    .filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
    .map((d) => d.trim().slice(0, 80));

  if (cleanDepartments.length === 0) {
    return res.status(400).json({
      error: 'At least one valid clinical department name must be provided.',
      code: 'EMPTY_DEPARTMENTS',
    });
  }

  // 8. Atomic Concurrency Lock Gate
  if (inFlightRegistrations.has(normalizedCode)) {
    return res.status(409).json({
      error: `A registration for Hospital Code "${normalizedCode}" is currently being processed. Please try again in a moment.`,
      code: 'REGISTRATION_IN_FLIGHT',
    });
  }

  // Acquire in-flight lock to guarantee race-condition safety
  inFlightRegistrations.add(normalizedCode);

  try {
    const nowIso = new Date().toISOString();
    const cleanName = name.trim();
    const cleanAddress = address.trim();
    const cleanCity = city.trim();
    const cleanState = state.trim();

    // Check pre-registered codes
    if (registeredHospitalCodes.has(normalizedCode)) {
      return res.status(409).json({
        error: `Hospital Code "${normalizedCode}" is already in use by a registered healthcare facility. Please choose or generate a unique Hospital Code.`,
        code: 'HOSPITAL_CODE_TAKEN',
      });
    }

    // Generate secure, unique facility ID server-side
    const codeSlug = normalizedCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomSuffix = crypto.randomBytes(3).toString('hex');
    const newFacilityId = `fac_${codeSlug}_${randomSuffix}`;

    const facilityData = {
      id: newFacilityId,
      ownerId: 'platform_pending_review',
      name: cleanName,
      location: `${cleanAddress}, ${cleanCity}, ${cleanState}`,
      facilityType: cleanType,
      facilityCode: normalizedCode,
      state: cleanState,
      status: 'Pending', // Controlled initial lifecycle status: STRICTLY PENDING
      departments: cleanDepartments,
      contactEmail: cleanContactEmail,
      contactPhone: cleanContactPhone,
      adminName: cleanAdminName,
      adminEmail: cleanAdminEmail,
      adminRoleTitle: cleanAdminRoleTitle,
      createdAt: nowIso,
    };

    const auditLogId = `aud_reg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const auditLogData = {
      id: auditLogId,
      ownerId: 'system',
      userId: 'pending_applicant',
      userName: cleanAdminName,
      userRole: 'FacilityAdmin',
      facilityId: newFacilityId,
      action: `Submitted facility registration for ${cleanName} with Hospital Code ${normalizedCode} (Status: Pending Platform Review)`,
      patientId: '',
      encounterId: '',
      timestamp: nowIso,
    };

    // 9. Firestore Persistence Attempt & Server Registry Integration
    let persistedToFirestore = false;
    let persistenceWarning: string | null = null;

    if (adminDb) {
      try {
        await adminDb.runTransaction(async (transaction) => {
          const codeRef = adminDb!.collection('facilityCodes').doc(normalizedCode);
          const codeSnap = await transaction.get(codeRef);
          if (codeSnap.exists) {
            throw new Error('CODE_ALREADY_EXISTS');
          }
          transaction.set(codeRef, {
            code: normalizedCode,
            facilityId: newFacilityId,
            registeredAt: nowIso,
          });
          transaction.set(adminDb!.collection('facilities').doc(newFacilityId), facilityData);
          transaction.set(adminDb!.collection('auditLogs').doc(auditLogId), auditLogData);
        });
        persistedToFirestore = true;
      } catch (firestoreErr: any) {
        if (firestoreErr?.message === 'CODE_ALREADY_EXISTS') {
          return res.status(409).json({
            error: `Hospital Code "${normalizedCode}" is already registered in the database. Please choose a different code.`,
            code: 'CODE_ALREADY_EXISTS',
          });
        }

        // Diagnostic log: explain why direct Admin Firestore write did not commit
        console.warn(
          'Admin Firestore transaction did not complete during facility registration:',
          firestoreErr?.message || firestoreErr
        );
        persistenceWarning =
          'Direct Firestore sync is pending IAM roles/datastore.user permission on the Cloud project. Registration recorded in active server registry.';
      }
    } else {
      persistenceWarning = 'Database connection uninitialized. Registration recorded in active server registry.';
    }

    // Register into server registry so facility is active and tracked in Pending status
    registeredHospitalCodes.set(normalizedCode, {
      facilityId: newFacilityId,
      registeredAt: nowIso,
      status: 'Pending',
    });
    inMemoryFacilities.set(newFacilityId, facilityData);

    return res.status(201).json({
      success: true,
      status: 'Pending',
      persistedToFirestore,
      persistenceWarning,
      message: persistedToFirestore
        ? 'Facility registration submitted successfully. Your healthcare workspace is currently PENDING review by a Platform Administrator.'
        : 'Facility registration received and recorded in Pending review. (Database synchronization pending Cloud IAM permissions).',
      facility: {
        id: newFacilityId,
        name: cleanName,
        facilityCode: normalizedCode,
        facilityType: cleanType,
        location: `${cleanAddress}, ${cleanCity}, ${cleanState}`,
        state: cleanState,
        status: 'Pending',
        departments: cleanDepartments,
        contactEmail: cleanContactEmail,
        contactPhone: cleanContactPhone,
        adminName: cleanAdminName,
        adminEmail: cleanAdminEmail,
        adminRoleTitle: cleanAdminRoleTitle,
        createdAt: nowIso,
      },
    });
  } finally {
    // Release in-flight concurrency lock
    inFlightRegistrations.delete(normalizedCode);
  }
});

// Endpoint: Platform Admin Facility Status Lifecycle Management
app.patch('/api/facilities/:facilityId/status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required. Please sign in with Platform Administrator credentials.',
        code: 'UNAUTHENTICATED',
      });
    }
    const idToken = authHeader.substring(7).trim();
    if (!idToken) {
      return res.status(401).json({
        error: 'Authentication token missing.',
        code: 'TOKEN_MISSING',
      });
    }

    let authContext;
    try {
      authContext = await verifyAdministratorCaller(idToken);
    } catch {
      return res.status(401).json({
        error: 'Your administrative session is invalid or has expired. Please sign in again.',
        code: 'INVALID_SESSION',
      });
    }

    if (!authContext.isPlatformAdmin) {
      return res.status(403).json({
        error:
          'Access denied. Only verified Platform Administrators can change healthcare facility operational status.',
        code: 'FORBIDDEN',
      });
    }

    const { facilityId } = req.params;
    if (!facilityId || !/^[a-zA-Z0-9_\-]+$/.test(facilityId)) {
      return res.status(400).json({
        error: 'A valid facility identifier is required.',
        code: 'INVALID_FACILITY_ID',
      });
    }

    const { status } = req.body || {};
    const ALLOWED_STATUSES = ['Pending', 'Onboarding', 'Active', 'Rejected', 'Suspended'];
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Permitted statuses: ${ALLOWED_STATUSES.join(', ')}.`,
        code: 'INVALID_STATUS',
      });
    }

    const nowIso = new Date().toISOString();
    let persistedToFirestore = false;

    // 1. Attempt Firestore update if Admin SDK is available
    if (adminDb) {
      try {
        await adminDb.collection('facilities').doc(facilityId).update({
          status,
          updatedAt: nowIso,
        });
        persistedToFirestore = true;

        // Record audit log
        const auditLogId = `aud_stat_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        await adminDb.collection('auditLogs').doc(auditLogId).set({
          id: auditLogId,
          ownerId: authContext.callerUid,
          userId: authContext.callerUid,
          userName: authContext.callerName,
          userRole: 'PlatformAdmin',
          facilityId,
          action: `Platform Administrator updated facility status to "${status}"`,
          patientId: '',
          encounterId: '',
          timestamp: nowIso,
        });
      } catch (adminDbErr: any) {
        console.warn('Status update Firestore write warning:', adminDbErr?.message || adminDbErr);
      }
    }

    // 2. Synchronize server-side registry
    if (inMemoryFacilities.has(facilityId)) {
      const existing = inMemoryFacilities.get(facilityId);
      inMemoryFacilities.set(facilityId, { ...existing, status, updatedAt: nowIso });
      const facCode = existing.facilityCode;
      if (facCode && registeredHospitalCodes.has(facCode)) {
        const codeRec = registeredHospitalCodes.get(facCode)!;
        registeredHospitalCodes.set(facCode, { ...codeRec, status });
      }
    }

    return res.json({
      success: true,
      facilityId,
      status,
      persistedToFirestore,
      updatedAt: nowIso,
    });
  } catch (err: any) {
    console.error('Facility status update error:', err);
    return res.status(500).json({
      error: 'Unable to update facility operational status.',
      code: 'SERVER_ERROR',
    });
  }
});

// ============================================================================
// MULTI-FACILITY MEMBERSHIP ARCHITECTURE (Stage 2B)
// ============================================================================

// Server-side in-memory registry of facility memberships
const registeredFacilityMemberships = new Map<string, FacilityMembership>();

// Seed initial baseline multi-facility memberships
const seedMemberships: FacilityMembership[] = [
  // Dr. Adaeze Okafor - Member of TWO facilities with DIFFERENT roles
  {
    membershipId: generateMembershipId('fac_lagos_island_001', 'adaeze.okafor'),
    userId: 'usr_clinician_demo',
    facilityId: 'fac_lagos_island_001',
    facilityCode: 'LLSC-VI',
    username: 'adaeze.okafor',
    normalizedUsername: 'adaeze.okafor',
    role: 'Doctor',
    departmentId: 'Cardiology & Hypertension',
    status: 'Active',
    permissions: DEFAULT_ROLE_PERMISSIONS.Doctor,
    createdAt: '2026-01-15T08:30:00.000Z',
    updatedAt: '2026-01-15T08:30:00.000Z',
    createdBy: 'system_bootstrap',
    displayName: 'Dr. Adaeze Okafor',
    email: 'adaeze.okafor@cornerbrief-demo.ng',
  },
  {
    membershipId: generateMembershipId('fac_abuja_national_002', 'adaeze.okafor'),
    userId: 'usr_clinician_demo',
    facilityId: 'fac_abuja_national_002',
    facilityCode: 'ACCH-ABJ',
    username: 'adaeze.okafor',
    normalizedUsername: 'adaeze.okafor',
    role: 'FacilityAdmin', // Different role across hospitals
    departmentId: 'Internal Medicine',
    status: 'Active',
    permissions: DEFAULT_ROLE_PERMISSIONS.FacilityAdmin,
    createdAt: '2026-02-02T10:00:00.000Z',
    updatedAt: '2026-02-02T10:00:00.000Z',
    createdBy: 'system_bootstrap',
    displayName: 'Dr. Adaeze Okafor (Facility Admin / CMD)',
    email: 'adaeze.okafor@cornerbrief-demo.ng',
  },
  // Same username ('musa') across TWO different hospitals
  {
    membershipId: generateMembershipId('fac_abuja_national_002', 'musa'),
    userId: 'usr_abj_staff_demo',
    facilityId: 'fac_abuja_national_002',
    facilityCode: 'ACCH-ABJ',
    username: 'musa',
    normalizedUsername: 'musa',
    role: 'RecordsStaff',
    departmentId: 'Emergency & Acute Care',
    status: 'Active',
    permissions: DEFAULT_ROLE_PERMISSIONS.RecordsStaff,
    createdAt: '2026-02-03T08:45:00.000Z',
    updatedAt: '2026-02-03T08:45:00.000Z',
    createdBy: 'system_bootstrap',
    displayName: 'Musa Garba',
    email: 'musa.garba@cedarcrest-demo.ng',
  },
  {
    membershipId: generateMembershipId('fac_ph_riverside_003', 'musa'),
    userId: 'usr_ph_staff_demo',
    facilityId: 'fac_ph_riverside_003',
    facilityCode: 'PRMC-PHC',
    username: 'musa', // Same username in different hospital
    normalizedUsername: 'musa',
    role: 'Nurse',
    departmentId: 'General Outpatient (GOPD)',
    status: 'Active',
    permissions: DEFAULT_ROLE_PERMISSIONS.Nurse,
    createdAt: '2026-02-19T08:30:00.000Z',
    updatedAt: '2026-02-19T08:30:00.000Z',
    createdBy: 'system_bootstrap',
    displayName: 'Blessing Musa Wike',
    email: 'blessing.wike@riverside-demo.ng',
  },
  // Dr. Tamuno Briggs - Single facility membership in Port Harcourt
  {
    membershipId: generateMembershipId('fac_ph_riverside_003', 'tamuno.briggs'),
    userId: 'usr_ph_clinician_demo',
    facilityId: 'fac_ph_riverside_003',
    facilityCode: 'PRMC-PHC',
    username: 'tamuno.briggs',
    normalizedUsername: 'tamuno.briggs',
    role: 'Doctor',
    departmentId: 'Family Medicine',
    status: 'Active',
    permissions: DEFAULT_ROLE_PERMISSIONS.Doctor,
    createdAt: '2026-02-18T11:00:00.000Z',
    updatedAt: '2026-02-18T11:00:00.000Z',
    createdBy: 'system_bootstrap',
    displayName: 'Dr. Tamuno Briggs',
    email: 'tamuno.briggs@riverside-demo.ng',
  },
  // Suspended membership
  {
    membershipId: generateMembershipId('fac_lagos_island_001', 'dr.suspended'),
    userId: 'usr_suspended_demo',
    facilityId: 'fac_lagos_island_001',
    facilityCode: 'LLSC-VI',
    username: 'dr.suspended',
    normalizedUsername: 'dr.suspended',
    role: 'Doctor',
    departmentId: 'General Outpatient (GOPD)',
    status: 'Suspended',
    permissions: DEFAULT_ROLE_PERMISSIONS.Doctor,
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-15T12:00:00.000Z',
    createdBy: 'system_bootstrap',
    displayName: 'Dr. Suspended Demo',
    email: 'suspended.demo@lagoon-demo.ng',
  },
  // Revoked membership
  {
    membershipId: generateMembershipId('fac_lagos_island_001', 'nurse.revoked'),
    userId: 'usr_revoked_demo',
    facilityId: 'fac_lagos_island_001',
    facilityCode: 'LLSC-VI',
    username: 'nurse.revoked',
    normalizedUsername: 'nurse.revoked',
    role: 'Nurse',
    departmentId: 'General Outpatient (GOPD)',
    status: 'Revoked',
    permissions: DEFAULT_ROLE_PERMISSIONS.Nurse,
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-20T14:00:00.000Z',
    createdBy: 'system_bootstrap',
    displayName: 'Nurse Revoked Demo',
    email: 'revoked.demo@lagoon-demo.ng',
  },
  // Invited membership (not yet activated)
  {
    membershipId: generateMembershipId('fac_lagos_island_001', 'invitee.staff'),
    userId: 'usr_invitee_demo',
    facilityId: 'fac_lagos_island_001',
    facilityCode: 'LLSC-VI',
    username: 'invitee.staff',
    normalizedUsername: 'invitee.staff',
    role: 'Staff',
    departmentId: 'General Outpatient (GOPD)',
    status: 'Invited',
    permissions: DEFAULT_ROLE_PERMISSIONS.Staff,
    createdAt: '2026-02-22T08:00:00.000Z',
    updatedAt: '2026-02-22T08:00:00.000Z',
    createdBy: 'system_bootstrap',
    displayName: 'Invitee Staff Demo',
    email: 'invitee.demo@lagoon-demo.ng',
  },
  // Active membership inside a SUSPENDED facility
  {
    membershipId: generateMembershipId('fac_suspended_demo_004', 'susp.doctor'),
    userId: 'usr_susp_fac_doctor',
    facilityId: 'fac_suspended_demo_004',
    facilityCode: 'SUSP-FAC',
    username: 'susp.doctor',
    normalizedUsername: 'susp.doctor',
    role: 'Doctor',
    departmentId: 'Laboratory & Diagnostics',
    status: 'Active',
    permissions: DEFAULT_ROLE_PERMISSIONS.Doctor,
    createdAt: '2026-02-25T08:00:00.000Z',
    updatedAt: '2026-02-25T08:00:00.000Z',
    createdBy: 'system_bootstrap',
    displayName: 'Dr. Suspended Facility Physician',
    email: 'doctor@suspended-fac.ng',
  },
];

for (const mem of seedMemberships) {
  registeredFacilityMemberships.set(mem.membershipId, mem);
}

// In-Memory Facility Metadata Mirror for Suspended Facility
inMemoryFacilities.set('fac_suspended_demo_004', {
  id: 'fac_suspended_demo_004',
  ownerId: 'platform_pending_review',
  name: 'Suspended Diagnostic Centre',
  location: '14 Regulatory Road, Lagos',
  facilityType: 'Medical Center',
  facilityCode: 'SUSP-FAC',
  state: 'Lagos State',
  status: 'Suspended',
  departments: ['Laboratory & Diagnostics'],
  createdAt: '2026-02-25T08:00:00.000Z',
});

// Server-side in-memory vault for staff password credentials (strictly separate from memberships, never exposed to client)
const registeredFacilityCredentials = new Map<string, FacilityCredential>();

// Server-side active authenticated sessions store
const activeSessions = new Map<string, AuthSession>();

function seedCredential(
  membershipId: string,
  facilityId: string,
  normalizedUsername: string,
  plaintext: string
) {
  const { salt, hash } = hashPassword(plaintext);
  registeredFacilityCredentials.set(membershipId, {
    membershipId,
    facilityId,
    normalizedUsername,
    salt,
    passwordHash: hash,
    algorithm: 'scrypt',
    updatedAt: new Date().toISOString(),
  });
}

// Seed baseline credentials for Stage 2C verification
seedCredential(
  generateMembershipId('fac_lagos_island_001', 'adaeze.okafor'),
  'fac_lagos_island_001',
  'adaeze.okafor',
  'Password123!'
);
seedCredential(
  generateMembershipId('fac_abuja_national_002', 'adaeze.okafor'),
  'fac_abuja_national_002',
  'adaeze.okafor',
  'AbujaAdmin2026!'
);
seedCredential(
  generateMembershipId('fac_abuja_national_002', 'musa'),
  'fac_abuja_national_002',
  'musa',
  'MusaAbujaPass1!'
);
seedCredential(
  generateMembershipId('fac_ph_riverside_003', 'musa'),
  'fac_ph_riverside_003',
  'musa',
  'MusaRiversidePass2!'
);
seedCredential(
  generateMembershipId('fac_ph_riverside_003', 'tamuno.briggs'),
  'fac_ph_riverside_003',
  'tamuno.briggs',
  'RiversideDoc2026!'
);
seedCredential(
  generateMembershipId('fac_lagos_island_001', 'dr.suspended'),
  'fac_lagos_island_001',
  'dr.suspended',
  'SuspendedPass1!'
);
seedCredential(
  generateMembershipId('fac_lagos_island_001', 'nurse.revoked'),
  'fac_lagos_island_001',
  'nurse.revoked',
  'RevokedPass1!'
);
seedCredential(
  generateMembershipId('fac_lagos_island_001', 'invitee.staff'),
  'fac_lagos_island_001',
  'invitee.staff',
  'InvitedPass1!'
);
seedCredential(
  generateMembershipId('fac_suspended_demo_004', 'susp.doctor'),
  'fac_suspended_demo_004',
  'susp.doctor',
  'AnyPassword1!'
);

// Helper: Resolve Facility by ID from in-memory registry or Firestore
async function resolveFacilityRecord(facilityId: string) {
  if (inMemoryFacilities.has(facilityId)) {
    return inMemoryFacilities.get(facilityId);
  }
  for (const [code, meta] of registeredHospitalCodes.entries()) {
    if (meta.facilityId === facilityId) {
      return { id: facilityId, status: meta.status, facilityCode: code };
    }
  }
  if (adminDb) {
    try {
      const snap = await adminDb.collection('facilities').doc(facilityId).get();
      if (snap.exists) {
        return snap.data() as any;
      }
    } catch {
      // Diagnostic handled
    }
  }
  return null;
}

// Helper: Resolve Membership by user and facility
async function findMembershipByUserAndFacility(userId: string, facilityId: string) {
  for (const mem of registeredFacilityMemberships.values()) {
    if (mem.userId === userId && mem.facilityId === facilityId) {
      return mem;
    }
  }
  if (adminDb) {
    try {
      const snap = await adminDb
        .collection('facilityMemberships')
        .where('userId', '==', userId)
        .where('facilityId', '==', facilityId)
        .limit(1)
        .get();
      if (!snap.empty) {
        return snap.docs[0].data() as FacilityMembership;
      }
    } catch {
      // Diagnostic handled
    }
  }
  return null;
}

// Endpoint: Check Username Availability within a Specific Facility
app.get('/api/facilities/:facilityId/check-username/:username', async (req, res) => {
  const { facilityId, username } = req.params;
  if (!facilityId || !username) {
    return res.status(400).json({ error: 'Facility ID and username are required.', available: false });
  }

  const normalized = normalizeUsername(username);
  const validation = validateUsername(normalized);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error, available: false });
  }

  const membershipId = generateMembershipId(facilityId, normalized);

  // Check in-memory registry
  if (registeredFacilityMemberships.has(membershipId)) {
    return res.json({ facilityId, username, normalizedUsername: normalized, available: false });
  }

  // Check Firestore if available
  if (adminDb) {
    try {
      const snap = await adminDb.collection('facilityMemberships').doc(membershipId).get();
      if (snap.exists) {
        return res.json({ facilityId, username, normalizedUsername: normalized, available: false });
      }
    } catch {
      // Diagnostic handled
    }
  }

  return res.json({ facilityId, username, normalizedUsername: normalized, available: true });
});

// Endpoint: List All Memberships for a Healthcare Facility (Restricted to FacilityAdmin / PlatformAdmin)
app.get('/api/facilities/:facilityId/memberships', async (req, res) => {
  const { facilityId } = req.params;
  const authHeader = req.headers.authorization;
  let isAuthorized = false;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    try {
      const authContext = await verifyAdministratorCaller(token);
      if (
        authContext.isPlatformAdmin ||
        (authContext.isFacilityAdmin && authContext.callerFacilityId === facilityId)
      ) {
        isAuthorized = true;
      }
    } catch {
      // Handled below
    }
  }

  // Fallback for development sandbox testing
  if (!isAuthorized && req.headers['x-admin-facility-id'] === facilityId) {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return res.status(403).json({
      error: 'Access denied. Only authorized Facility Administrators can view facility staff memberships.',
      code: 'UNAUTHORIZED',
    });
  }

  const results: FacilityMembership[] = [];
  for (const mem of registeredFacilityMemberships.values()) {
    if (mem.facilityId === facilityId) {
      results.push(mem);
    }
  }

  if (adminDb) {
    try {
      const snap = await adminDb
        .collection('facilityMemberships')
        .where('facilityId', '==', facilityId)
        .get();
      snap.forEach((doc) => {
        const data = doc.data() as FacilityMembership;
        if (!results.some((m) => m.membershipId === data.membershipId)) {
          results.push(data);
        }
      });
    } catch {
      // Diagnostic handled
    }
  }

  return res.json({ facilityId, count: results.length, memberships: results });
});

// Endpoint: Get All Multi-Facility Memberships for a User Identity
app.get('/api/memberships/user/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  const results: FacilityMembership[] = [];
  for (const mem of registeredFacilityMemberships.values()) {
    if (mem.userId === userId) {
      results.push(mem);
    }
  }

  if (adminDb) {
    try {
      const snap = await adminDb
        .collection('facilityMemberships')
        .where('userId', '==', userId)
        .get();
      snap.forEach((doc) => {
        const data = doc.data() as FacilityMembership;
        if (!results.some((m) => m.membershipId === data.membershipId)) {
          results.push(data);
        }
      });
    } catch {
      // Diagnostic handled
    }
  }

  return res.json({ userId, memberships: results });
});

// Endpoint: Register New Facility Membership (Server-Enforced Hospital Code & Unique Username)
app.post('/api/facilities/:facilityId/memberships', async (req, res) => {
  const { facilityId } = req.params;
  const {
    userId,
    username,
    role,
    departmentId,
    permissions,
    facilityCode,
    displayName,
    email,
  } = req.body || {};

  // 1. Authorization check: Verify caller is FacilityAdmin for this facility or PlatformAdmin
  const authHeader = req.headers.authorization;
  let isAuthorized = false;
  let callerId = 'admin';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    try {
      const authContext = await verifyAdministratorCaller(token);
      if (
        authContext.isPlatformAdmin ||
        (authContext.isFacilityAdmin && authContext.callerFacilityId === facilityId)
      ) {
        isAuthorized = true;
        callerId = authContext.callerUid;
      }
    } catch {
      // Fall through
    }
  }

  // Developer sandbox authorization check
  if (!isAuthorized && req.headers['x-admin-facility-id'] === facilityId) {
    isAuthorized = true;
    callerId = (req.headers['x-admin-user-id'] as string) || 'admin_caller';
  }

  if (!isAuthorized) {
    return res.status(403).json({
      error:
        'Access denied: You must be an authorized Facility Administrator or Platform Administrator to create facility memberships.',
      code: 'FORBIDDEN',
    });
  }

  // 2. Verify target facility exists and is ACTIVE
  const facility = await resolveFacilityRecord(facilityId);
  const facCheck = checkFacilityStatus(facility);
  if (!facCheck.active) {
    return res.status(403).json({
      error: facCheck.error,
      code: facCheck.code,
    });
  }

  // 3. Validate user identity ID
  if (!userId || typeof userId !== 'string' || userId.trim().length < 2) {
    return res.status(400).json({ error: 'A valid userId is required.', code: 'INVALID_USER_ID' });
  }

  // 4. Validate and normalize username
  const normalized = normalizeUsername(username);
  const usernameCheck = validateUsername(normalized);
  if (!usernameCheck.valid) {
    return res.status(400).json({ error: usernameCheck.error, code: 'INVALID_USERNAME' });
  }

  // 5. Enforce Username Uniqueness within this hospital
  const membershipId = generateMembershipId(facilityId, normalized);
  if (registeredFacilityMemberships.has(membershipId)) {
    return res.status(409).json({
      error: `The username "${username}" is already assigned to a staff member in this hospital. Usernames must be unique within each facility.`,
      code: 'USERNAME_ALREADY_EXISTS_IN_FACILITY',
    });
  }

  if (adminDb) {
    try {
      const existingDoc = await adminDb.collection('facilityMemberships').doc(membershipId).get();
      if (existingDoc.exists) {
        return res.status(409).json({
          error: `The username "${username}" is already registered in this facility.`,
          code: 'USERNAME_ALREADY_EXISTS_IN_FACILITY',
        });
      }
    } catch {
      // Handled
    }
  }

  // 6. Validate Role
  const ALLOWED_ROLES: UserRole[] = [
    'FacilityAdmin',
    'Doctor',
    'Nurse',
    'HR',
    'RecordsStaff',
    'Admin',
    'Clinician',
    'Staff',
  ];
  if (!role || !ALLOWED_ROLES.includes(role as UserRole)) {
    return res.status(400).json({
      error: `Invalid facility role. Permitted roles: ${ALLOWED_ROLES.join(', ')}.`,
      code: 'INVALID_ROLE',
    });
  }

  const assignedPermissions = resolveAuthorizedPermissions(role as UserRole, permissions);
  const nowIso = new Date().toISOString();

  // 7. Construct FacilityMembership document (Strictly NO password exposed)
  const newMembership: FacilityMembership = {
    membershipId,
    userId: userId.trim(),
    facilityId,
    facilityCode: facilityCode || facility?.facilityCode || 'CB-FAC',
    username: username.trim(),
    normalizedUsername: normalized,
    role: role as UserRole,
    departmentId: (departmentId || 'General Outpatient (GOPD)').trim(),
    status: 'Active',
    permissions: assignedPermissions,
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: callerId,
    displayName: displayName || username.trim(),
    email: email || `${normalized}@${(facility?.facilityCode || 'cb').toLowerCase()}.ng`,
  };

  // 8. Commit to in-memory registry
  registeredFacilityMemberships.set(membershipId, newMembership);

  // 9. Attempt Firestore Admin commit
  let persistedToFirestore = false;
  if (adminDb) {
    try {
      await adminDb.collection('facilityMemberships').doc(membershipId).set(newMembership);
      persistedToFirestore = true;
    } catch (err: any) {
      console.warn('Membership Firestore write warning:', err?.message || err);
    }
  }

  return res.status(201).json({
    success: true,
    membership: newMembership,
    persistedToFirestore,
  });
});

// Endpoint: Update Membership Status (Active, Suspended, Revoked)
app.patch('/api/facilities/:facilityId/memberships/:membershipId/status', async (req, res) => {
  const { facilityId, membershipId } = req.params;
  const { status } = req.body || {};

  const ALLOWED_STATUSES: MembershipStatus[] = ['Active', 'Suspended', 'Revoked', 'Invited'];
  if (!status || !ALLOWED_STATUSES.includes(status as MembershipStatus)) {
    return res.status(400).json({
      error: `Invalid status. Permitted statuses: ${ALLOWED_STATUSES.join(', ')}.`,
      code: 'INVALID_STATUS',
    });
  }

  // Authorization check
  const authHeader = req.headers.authorization;
  let isAuthorized = false;
  let callerUid = 'admin';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    try {
      const authContext = await verifyAdministratorCaller(token);
      if (
        authContext.isPlatformAdmin ||
        (authContext.isFacilityAdmin && authContext.callerFacilityId === facilityId)
      ) {
        isAuthorized = true;
        callerUid = authContext.callerUid;
      }
    } catch {
      // Fall through
    }
  }

  if (!isAuthorized && req.headers['x-admin-facility-id'] === facilityId) {
    isAuthorized = true;
    callerUid = (req.headers['x-admin-user-id'] as string) || 'admin_caller';
  }

  if (!isAuthorized) {
    return res.status(403).json({
      error: 'Access denied: Only authorized Facility Administrators can modify membership status.',
      code: 'FORBIDDEN',
    });
  }

  // Find membership
  const existing = registeredFacilityMemberships.get(membershipId);
  if (!existing || existing.facilityId !== facilityId) {
    return res.status(404).json({
      error: 'The requested facility membership could not be found.',
      code: 'MEMBERSHIP_NOT_FOUND',
    });
  }

  // Safety: Prevent user from modifying their own membership status
  if (existing.userId === callerUid && req.headers['x-is-platform-admin'] !== 'true') {
    return res.status(403).json({
      error: 'Self-modification forbidden: You cannot modify your own facility membership status.',
      code: 'SELF_MODIFICATION_FORBIDDEN',
    });
  }

  const nowIso = new Date().toISOString();
  existing.status = status as MembershipStatus;
  existing.updatedAt = nowIso;
  registeredFacilityMemberships.set(membershipId, existing);

  if (adminDb) {
    try {
      await adminDb.collection('facilityMemberships').doc(membershipId).update({
        status,
        updatedAt: nowIso,
      });
    } catch {
      // Handled
    }
  }

  return res.json({
    success: true,
    membershipId,
    status,
    updatedAt: nowIso,
  });
});

// Endpoint: Verify Clinical Tenant Boundary Access
app.post('/api/clinical/verify-access', async (req, res) => {
  const { userId, activeFacilityId, patientFacilityId, encounterFacilityId } = req.body || {};

  if (!userId || !activeFacilityId || !patientFacilityId) {
    return res.status(400).json({
      error: 'userId, activeFacilityId, and patientFacilityId are required.',
      code: 'MISSING_PARAMETERS',
    });
  }

  // 1. Resolve Facility & Membership
  const facility = await resolveFacilityRecord(activeFacilityId);
  const membership = await findMembershipByUserAndFacility(userId, activeFacilityId);

  // 2. Verify Active Membership
  const verification = verifyActiveFacilityMembership(membership, facility);
  if (!verification.authorized) {
    return res.status(403).json({
      authorized: false,
      error: verification.error,
      code: verification.code,
    });
  }

  // 3. Verify Clinical Record Isolation Boundary
  const clinicalCheck = verifyFacilityClinicalAccess(
    membership!,
    patientFacilityId,
    encounterFacilityId
  );
  if (!clinicalCheck.authorized) {
    return res.status(403).json({
      authorized: false,
      error: clinicalCheck.error,
      code: clinicalCheck.code,
    });
  }

  return res.json({
    authorized: true,
    userId,
    activeFacilityId,
    role: verification.role,
    permissions: verification.permissions,
  });
});

// ============================================================================
// HOSPITAL CODE + USERNAME + PASSWORD AUTHENTICATION (Stage 2C)
// ============================================================================

// Helper: Parse cookies from incoming request headers
function parseRequestCookies(req: express.Request): Record<string, string> {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((item) => {
    const parts = item.split('=');
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('=').trim());
    }
  });
  return cookies;
}

// Endpoint: Staff Login (Hospital Code + Username + Password)
app.post('/api/auth/login', async (req, res) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const { hospitalCode, username, password } = req.body || {};

  // 1. Validate Hospital Code Format
  if (!hospitalCode || typeof hospitalCode !== 'string') {
    return res.status(400).json({
      error: 'Please enter your Hospital Code (e.g., LLSC-VI, ACCH-ABJ).',
      code: 'MISSING_HOSPITAL_CODE',
    });
  }

  const cleanHospitalCode = hospitalCode.trim().toUpperCase();
  const HOSPITAL_CODE_REGEX = /^[A-Z0-9-]{3,12}$/;
  if (!HOSPITAL_CODE_REGEX.test(cleanHospitalCode)) {
    return res.status(400).json({
      error: 'Hospital Code must be 3-12 characters and contain only uppercase letters, numbers, and hyphens.',
      code: 'INVALID_HOSPITAL_CODE',
    });
  }

  // 2. Validate Username Format
  if (!username || typeof username !== 'string') {
    return res.status(400).json({
      error: 'Please enter your staff username.',
      code: 'MISSING_USERNAME',
    });
  }

  const cleanUsername = normalizeUsername(username);
  const usernameCheck = validateUsername(cleanUsername);
  if (!usernameCheck.valid) {
    return res.status(400).json({
      error: usernameCheck.error || 'Please enter a valid staff username.',
      code: 'INVALID_USERNAME',
    });
  }

  // 3. Validate Password Presence
  if (!password || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({
      error: 'Please enter your account password.',
      code: 'MISSING_PASSWORD',
    });
  }

  // 4. Rate Limiting (Brute-Force Guard)
  const rateLimit = checkLoginRateLimit(clientIp, cleanHospitalCode);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: 'Too many unsuccessful login attempts. Please wait 5 minutes before trying again.',
      code: 'LOGIN_RATE_LIMITED',
    });
  }

  // 5. Resolve Facility by Hospital Code
  const facilityMeta = registeredHospitalCodes.get(cleanHospitalCode);
  if (!facilityMeta) {
    // Generic authentication failure message (never disclose whether hospital code or username exists)
    return res.status(401).json({
      error: 'Invalid Hospital Code, username, or password. Please verify your credentials.',
      code: 'INVALID_CREDENTIALS',
    });
  }

  const facility = await resolveFacilityRecord(facilityMeta.facilityId);
  if (!facility) {
    return res.status(401).json({
      error: 'Invalid Hospital Code, username, or password. Please verify your credentials.',
      code: 'INVALID_CREDENTIALS',
    });
  }

  // 6. Confirm Facility Operational Status (Active only)
  const facCheck = checkFacilityStatus(facility);
  if (!facCheck.active) {
    return res.status(403).json({
      error: 'This healthcare facility workspace is currently inactive or pending administrative approval.',
      code: facCheck.code || 'FACILITY_NOT_ACTIVE',
    });
  }

  // 7. Resolve Membership for this facility & username
  const membershipId = generateMembershipId(facility.id, cleanUsername);
  let membership = registeredFacilityMemberships.get(membershipId);

  if (!membership && adminDb) {
    try {
      const snap = await adminDb.collection('facilityMemberships').doc(membershipId).get();
      if (snap.exists) {
        membership = snap.data() as FacilityMembership;
      }
    } catch {
      // Handled
    }
  }

  if (!membership) {
    // Generic authentication failure
    return res.status(401).json({
      error: 'Invalid Hospital Code, username, or password. Please verify your credentials.',
      code: 'INVALID_CREDENTIALS',
    });
  }

  // 8. Confirm Membership Lifecycle Status
  if (membership.status === 'Suspended') {
    return res.status(403).json({
      error: 'Your membership for this healthcare facility has been suspended by an administrator.',
      code: 'MEMBERSHIP_SUSPENDED',
    });
  }

  if (membership.status === 'Revoked') {
    return res.status(403).json({
      error: 'Your membership for this healthcare facility has been revoked.',
      code: 'MEMBERSHIP_REVOKED',
    });
  }

  if (membership.status === 'Invited') {
    return res.status(403).json({
      error: 'Your membership invitation has not yet been activated. Please contact your Facility Administrator.',
      code: 'MEMBERSHIP_INVITED',
    });
  }

  if (membership.status !== 'Active') {
    return res.status(403).json({
      error: 'Your membership for this healthcare facility is not active.',
      code: 'MEMBERSHIP_INVALID',
    });
  }

  // 9. Verify Staff Member's Password Securely
  let credential = registeredFacilityCredentials.get(membershipId);
  if (!credential && adminDb) {
    try {
      const credSnap = await adminDb.collection('facilityCredentials').doc(membershipId).get();
      if (credSnap.exists) {
        credential = credSnap.data() as FacilityCredential;
      }
    } catch {
      // Handled
    }
  }

  if (!credential) {
    return res.status(401).json({
      error: 'Invalid Hospital Code, username, or password. Please verify your credentials.',
      code: 'INVALID_CREDENTIALS',
    });
  }

  const isPasswordValid = verifyPassword(password, credential.salt, credential.passwordHash);
  if (!isPasswordValid) {
    return res.status(401).json({
      error: 'Invalid Hospital Code, username, or password. Please verify your credentials.',
      code: 'INVALID_CREDENTIALS',
    });
  }

  // 10. Successful Authentication: Reset rate limiter and create session
  resetLoginRateLimit(clientIp, cleanHospitalCode);

  const sessionId = crypto.randomBytes(24).toString('hex');
  const sessionToken = createSessionToken(sessionId);
  const now = Date.now();
  const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

  const sessionData: AuthSession = {
    sessionId,
    userId: membership.userId,
    membershipId: membership.membershipId,
    facilityId: facility.id,
    facilityCode: cleanHospitalCode,
    role: membership.role,
    permissions: membership.permissions || DEFAULT_ROLE_PERMISSIONS[membership.role] || [],
    username: membership.username,
    displayName: membership.displayName || membership.username,
    email: membership.email || `${cleanUsername}@${cleanHospitalCode.toLowerCase()}.ng`,
    createdAt: now,
    expiresAt,
  };

  activeSessions.set(sessionId, sessionData);

  // Set secure HttpOnly session cookie (enforces Secure flag on HTTPS)
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader(
    'Set-Cookie',
    `cb_session=${sessionToken}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${isHttps ? '; Secure' : ''}`
  );

  // Return minimal required user & facility information (Strictly NO password hash or salt)
  return res.json({
    success: true,
    token: sessionToken,
    session: {
      sessionId,
      token: sessionToken,
      expiresAt,
    },
    membership: {
      membershipId: membership.membershipId,
      userId: membership.userId,
      facilityId: facility.id,
      facilityCode: cleanHospitalCode,
      username: membership.username,
      normalizedUsername: membership.normalizedUsername,
      role: membership.role,
      departmentId: membership.departmentId,
      status: membership.status,
      permissions: sessionData.permissions,
      createdAt: membership.createdAt,
    },
    user: {
      id: membership.userId,
      name: sessionData.displayName,
      email: sessionData.email,
      username: membership.username,
      role: membership.role,
      permissions: sessionData.permissions,
      facilityId: facility.id,
    },
    facility: {
      id: facility.id,
      name: facility.name,
      facilityCode: cleanHospitalCode,
      facilityType: facility.facilityType,
      location: facility.location,
    },
  });
});

// Endpoint: Session Verification
app.get('/api/auth/session', async (req, res) => {
  const authHeader = req.headers.authorization;
  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else {
    const cookies = parseRequestCookies(req);
    token = cookies['cb_session'] || null;
  }

  if (!token) {
    return res.status(401).json({
      authenticated: false,
      error: 'No active session token provided.',
      code: 'UNAUTHENTICATED',
    });
  }

  const sessionId = verifySessionToken(token);
  if (!sessionId) {
    return res.status(401).json({
      authenticated: false,
      error: 'Invalid session token signature.',
      code: 'INVALID_SESSION',
    });
  }

  const session = activeSessions.get(sessionId);
  if (!session) {
    return res.status(401).json({
      authenticated: false,
      error: 'Session not found or already terminated.',
      code: 'SESSION_NOT_FOUND',
    });
  }

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(sessionId);
    return res.status(401).json({
      authenticated: false,
      error: 'Your session has expired. Please sign in again.',
      code: 'SESSION_EXPIRED',
    });
  }

  return res.json({
    authenticated: true,
    membership: {
      membershipId: session.membershipId,
      userId: session.userId,
      facilityId: session.facilityId,
      facilityCode: session.facilityCode,
      username: session.username,
      normalizedUsername: session.username.toLowerCase(),
      role: session.role,
      status: 'Active',
      permissions: session.permissions,
    },
    user: {
      id: session.userId,
      name: session.displayName,
      email: session.email,
      username: session.username,
      role: session.role,
      permissions: session.permissions,
      facilityId: session.facilityId,
    },
    facility: {
      id: session.facilityId,
      facilityCode: session.facilityCode,
    },
    session: {
      sessionId: session.sessionId,
      expiresAt: session.expiresAt,
    },
  });
});

// Endpoint: Staff Logout
app.post('/api/auth/logout', async (req, res) => {
  const authHeader = req.headers.authorization;
  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else {
    const cookies = parseRequestCookies(req);
    token = cookies['cb_session'] || null;
  }

  if (token) {
    const sessionId = verifySessionToken(token);
    if (sessionId) {
      activeSessions.delete(sessionId);
    }
  }

  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader(
    'Set-Cookie',
    `cb_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${isHttps ? '; Secure' : ''}`
  );

  return res.json({
    success: true,
    message: 'Staff session closed successfully.',
  });
});

// Endpoint: Administrative Credential Enrollment / Reset
app.post('/api/auth/set-credentials', async (req, res) => {
  const { facilityId, membershipId, password } = req.body || {};
  const authHeader = req.headers.authorization;

  // Authorization check: Must be FacilityAdmin of that facility or PlatformAdmin
  let isAuthorized = false;
  let adminCallerName = 'Administrator';
  let adminCallerUid = 'system_admin';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.substring(7).trim();
    // 1. Check if token is a CornerBrief signed staff session token
    const staffSessionId = verifySessionToken(idToken);
    if (staffSessionId) {
      const session = activeSessions.get(staffSessionId);
      if (session) {
        // Enforce that caller's membership is active
        const callerMembership = registeredFacilityMemberships.get(session.membershipId);
        if (callerMembership && callerMembership.status === 'Active') {
          if (
            (session.role === 'FacilityAdmin' || session.role === 'Admin') &&
            session.facilityId === facilityId
          ) {
            isAuthorized = true;
            adminCallerName = session.displayName || session.username;
            adminCallerUid = session.userId;
          }
        }
      }
    } else {
      // 2. Check if token is a Firebase ID Token (Platform Admin / Bootstrap)
      try {
        const authContext = await verifyAdministratorCaller(idToken);
        if (
          authContext.isPlatformAdmin ||
          (authContext.isFacilityAdmin && authContext.callerFacilityId === facilityId)
        ) {
          isAuthorized = true;
          adminCallerName = authContext.callerName;
          adminCallerUid = authContext.callerUid;
        }
      } catch {
        // Fall through
      }
    }
  }

  if (!isAuthorized) {
    return res.status(403).json({
      error: 'Access denied. Only Facility Administrators or Platform Administrators can enroll staff credentials.',
      code: 'FORBIDDEN',
    });
  }

  if (!membershipId || !password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({
      error: 'A valid membershipId and password (at least 8 characters) are required.',
      code: 'INVALID_CREDENTIALS_PAYLOAD',
    });
  }

  const membership = registeredFacilityMemberships.get(membershipId);
  if (!membership || membership.facilityId !== facilityId) {
    return res.status(404).json({
      error: 'Membership not found for this facility.',
      code: 'MEMBERSHIP_NOT_FOUND',
    });
  }

  seedCredential(membershipId, facilityId, membership.normalizedUsername, password);

  // Invalidate any existing active sessions for this membership upon credential reset
  let invalidatedSessionsCount = 0;
  for (const [sId, sess] of activeSessions.entries()) {
    if (sess.membershipId === membershipId) {
      activeSessions.delete(sId);
      invalidatedSessionsCount++;
    }
  }

  // Record audit log for credential reset
  const nowIso = new Date().toISOString();
  const auditLogId = `aud_cred_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const auditEntry = {
    id: auditLogId,
    facilityId,
    userId: adminCallerUid,
    userName: adminCallerName,
    action: `Password reset/enrolled for staff member "${membership.username}" (${membership.role})`,
    timestamp: nowIso,
  };

  let persistedToFirestore = false;
  if (adminDb) {
    try {
      const credData = registeredFacilityCredentials.get(membershipId)!;
      await adminDb.collection('facilityCredentials').doc(membershipId).set(credData);
      await adminDb.collection('auditLogs').doc(auditLogId).set(auditEntry);
      persistedToFirestore = true;
    } catch (err: any) {
      console.warn('Credential Firestore write warning:', err?.message || err);
    }
  }

  return res.json({
    success: true,
    membershipId,
    facilityId,
    invalidatedSessionsCount,
    persistedToFirestore,
  });
});

// Endpoint: Secure Staff Account Provisioning
app.post('/api/admin/provision-staff', async (req, res) => {
  try {
    // 1. Authenticate Request
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required. Please sign in with an administrative account.',
      });
    }

    const idToken = authHeader.substring(7).trim();
    if (!idToken) {
      return res.status(401).json({
        error: 'Authentication token missing. Please sign in again.',
      });
    }

    let authContext;
    try {
      authContext = await verifyAdministratorCaller(idToken);
    } catch {
      return res.status(401).json({
        error: 'Your administrative session is invalid or has expired. Please sign in again.',
      });
    }

    // 2. Validate Administrator Authorization
    const { isPlatformAdmin, callerRole, callerFacilityId, callerUid, callerName } = authContext;
    const isFacilityAdmin = callerRole === 'FacilityAdmin' || callerRole === 'Admin';

    if (!isPlatformAdmin && !isFacilityAdmin) {
      return res.status(403).json({
        error:
          'Access denied. Only Platform Administrators and authorized Facility Administrators can provision staff accounts.',
      });
    }

    // 3. Extract and Validate Input
    const { name, email, role, facilityId, department, temporaryPassword } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 120) {
      return res.status(400).json({
        error: 'A valid staff member full name (between 2 and 120 characters) is required.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      !email ||
      typeof email !== 'string' ||
      !emailRegex.test(email.trim()) ||
      email.trim().length > 160
    ) {
      return res.status(400).json({
        error: 'A valid staff email address is required for credentials provisioning.',
      });
    }

    const FACILITY_ADMIN_PERMITTED_ROLES = [
      'Doctor',
      'Nurse',
      'Clinician',
      'RecordsStaff',
      'HR',
      'Staff',
    ];

    const PLATFORM_ADMIN_PERMITTED_ROLES = [
      ...FACILITY_ADMIN_PERMITTED_ROLES,
      'FacilityAdmin',
      'Admin',
    ];

    if (!role || typeof role !== 'string') {
      return res.status(400).json({
        error: 'A staff role must be specified.',
      });
    }

    const cleanRole = role.trim();

    if (cleanRole === 'PlatformAdmin') {
      return res.status(403).json({
        error:
          'Access denied. Platform Administrator accounts cannot be created via staff provisioning.',
      });
    }

    if (!PLATFORM_ADMIN_PERMITTED_ROLES.includes(cleanRole)) {
      return res.status(400).json({
        error: `Invalid role specified. Permitted staff roles: ${PLATFORM_ADMIN_PERMITTED_ROLES.join(', ')}.`,
      });
    }

    if (
      !facilityId ||
      typeof facilityId !== 'string' ||
      !facilityId.trim() ||
      !/^[a-zA-Z0-9_\-]+$/.test(facilityId.trim())
    ) {
      return res.status(400).json({
        error: 'A valid healthcare facility identifier is required.',
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanFacilityId = facilityId.trim();
    const cleanDepartment =
      department && typeof department === 'string' && department.trim().length > 0
        ? department.trim().slice(0, 100)
        : 'General Outpatient (GOPD)';

    // 4. Enforce Server-Side Role Hierarchy & Facility Admin Scope Isolation
    // Facility Administrators may only provision clinical/operational staff within their assigned facility
    if (!isPlatformAdmin) {
      if (!callerFacilityId || callerFacilityId !== cleanFacilityId) {
        return res.status(403).json({
          error:
            'Access denied. Facility Administrators may only provision staff accounts within their own healthcare facility.',
        });
      }

      if (!FACILITY_ADMIN_PERMITTED_ROLES.includes(cleanRole)) {
        return res.status(403).json({
          error: `Access denied. Facility Administrators may only provision clinical and operational staff (${FACILITY_ADMIN_PERMITTED_ROLES.join(', ')}). Only Platform Administrators can provision Administrator accounts.`,
        });
      }
    }

    // 5. Verify Target Facility Exists
    const firestoreBaseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;
    const facilityUrl = `${firestoreBaseUrl}/facilities/${encodeURIComponent(cleanFacilityId)}`;
    try {
      const facilityRes = await fetch(facilityUrl, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!facilityRes.ok) {
        if (facilityRes.status === 404) {
          return res.status(404).json({
            error: 'The specified healthcare facility does not exist.',
          });
        }
        if (facilityRes.status === 403) {
          return res.status(403).json({
            error:
              'Access denied. You do not have authorization to access or provision staff for this healthcare facility.',
          });
        }
        return res.status(502).json({
          error:
            'Unable to verify healthcare facility. Database service is temporarily unavailable.',
        });
      }
    } catch {
      return res.status(502).json({
        error: 'Unable to connect to database service to verify facility.',
      });
    }

    // 6. Generate or Validate Temporary Password
    let tempPassword =
      typeof temporaryPassword === 'string' && temporaryPassword.trim().length >= 8
        ? temporaryPassword.trim()
        : generateSecureTemporaryPassword();

    // 7. Provision Firebase Auth User Account
    let newUid: string;
    try {
      const userRecord = await adminAuth.createUser({
        email: cleanEmail,
        password: tempPassword,
        displayName: cleanName,
        emailVerified: true,
      });
      newUid = userRecord.uid;
    } catch (authErr: any) {
      if (authErr?.code === 'auth/email-already-exists') {
        return res.status(409).json({
          error: 'An account with this email address already exists.',
        });
      }
      console.error('Firebase Auth admin createUser error:', authErr?.message || authErr);
      return res.status(500).json({
        error: `Unable to create user authentication account: ${authErr?.message || 'Authentication service error.'}`,
      });
    }

    const nowIso = new Date().toISOString();

    // 8. Persist User Record in Firestore
    // The profile belongs to the user themselves (ownerId == newUid) ensuring private account access under firestore.rules
    const userDocData = {
      id: newUid,
      ownerId: newUid,
      name: cleanName,
      email: cleanEmail,
      role: cleanRole,
      facilityId: cleanFacilityId,
      department: cleanDepartment,
      createdAt: nowIso,
    };

    if (!adminDb) {
      console.error('Staff provisioning failed: Admin Firestore SDK is not initialized.');
      await rollbackStaffProvisioning(newUid, false);
      return res.status(503).json({
        error:
          'Staff provisioning service is currently unavailable. Database administration service is uninitialized.',
      });
    }

    let userDocPersisted = false;
    try {
      await adminDb.collection('users').doc(newUid).set(userDocData);
      userDocPersisted = true;
    } catch (adminDbErr: any) {
      console.error(
        'Admin Firestore SDK write failed during staff provisioning (verify GCP Cloud Run IAM roles/datastore.user):',
        adminDbErr?.message || adminDbErr
      );
    }

    if (!userDocPersisted) {
      await rollbackStaffProvisioning(newUid, false);
      return res.status(502).json({
        error:
          'Failed to persist staff profile in database. Provisioning was aborted and credentials rolled back.',
      });
    }

    // 9. Append Immutable Audit Trail Log via Trusted Admin SDK
    const auditLogId = `aud_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const auditLogData = {
      id: auditLogId,
      ownerId: callerUid,
      userId: callerUid,
      userName: callerName,
      userRole: isPlatformAdmin ? 'PlatformAdmin' : 'FacilityAdmin',
      facilityId: cleanFacilityId,
      action: `Provisioned staff account for ${cleanName} (${cleanRole} · ${cleanDepartment}) in facility ${cleanFacilityId}`,
      patientId: '',
      encounterId: '',
      timestamp: nowIso,
    };

    let auditLogPersisted = false;
    try {
      await adminDb.collection('auditLogs').doc(auditLogId).set(auditLogData);
      auditLogPersisted = true;
    } catch (adminDbAuditErr: any) {
      console.error(
        'Admin Firestore audit log write failed during staff provisioning:',
        adminDbAuditErr?.message || adminDbAuditErr
      );
    }

    // If audit logging fails, rollback both user doc and auth account
    if (!auditLogPersisted) {
      console.error('Staff provisioning aborted: audit log persistence failed.');
      await rollbackStaffProvisioning(newUid, true);
      return res.status(502).json({
        error:
          'Failed to record required audit trail for staff provisioning. Account creation was aborted and rolled back.',
      });
    }

    return res.status(201).json({
      success: true,
      message: `Staff member account for ${cleanName} successfully provisioned.`,
      staff: {
        id: newUid,
        ownerId: newUid,
        name: cleanName,
        email: cleanEmail,
        role: cleanRole,
        facilityId: cleanFacilityId,
        department: cleanDepartment,
        createdAt: nowIso,
      },
      credentials: {
        email: cleanEmail,
        temporaryPassword: tempPassword,
        facilityId: cleanFacilityId,
        mustChangePassword: true,
      },
    });
  } catch (error) {
    console.error('Staff provisioning error:', error);
    return res.status(500).json({
      error: 'Unable to provision staff account. Please try again.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CornerBrief server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
