# CornerBrief — Product Requirements Document (PRD)

**Document Identifier:** CB-PRD-V1.0  
**Project Name:** CornerBrief  
**Embedded AI Assistant:** NONYE AI  
**Author / Lead:** Mervyn Dean Hilary (`mervyndeanhilary@gmail.com`)  
**Development Platform:** Google AI Studio Build  
**Document Status:** Baseline Generated from Existing Codebase Audit  
**Date:** October 2026  

---

## 1. Executive Summary

CornerBrief is an AI-assisted electronic health record (EHR), clinical encounter documentation, and hospital operations platform. Built for hospitals, specialist clinics, and medical centers in emerging healthcare markets (with specialized operational adaptations for Nigerian healthcare facilities), CornerBrief connects patient intake, triage vital signs capture, clinician consultation charting, and administrative workflows into a unified digital workspace.

At the core of CornerBrief is **NONYE AI**, an embedded clinical documentation assistant powered by Google's Gemini models. NONYE AI organizes point-of-care patient observations and narrative clinical notes into standardized medical structures with strict medical-legal boundaries, zero-hallucination guardrails, and human-in-the-loop clinician review.

This document formalizes the product requirements based on the verified codebase, distinguishing implemented capabilities from partially implemented features and proposed roadmap enhancements.

---

## 2. Product Vision and Purpose

### Vision
To eliminate administrative documentation burdens for healthcare professionals, standardize point-of-care clinical documentation, and safeguard medical record integrity across clinics and hospitals regardless of infrastructure constraints.

### Core Purpose
* Accelerate bedside and consultation documentation without sacrificing factual fidelity.
* Enforce medical-legal record integrity through immutable finalization locks and signed clinical addenda.
* Enable multi-departmental hospital management and structured patient tracking.
* Provide platform-level oversight for multi-facility operations while maintaining strict clinical data boundaries.

---

## 3. Healthcare Problems CornerBrief Aims to Address

1. **Severe Clinician Administrative Burden:** Physicians and nurses spend up to 40% of consultation time transcribing unstructured notes, reducing patient-facing care time and contributing to clinician burnout.
2. **Inconsistent and Omission-Prone Paper/Digital Records:** Crucial clinical facts (drug allergies, vital signs, follow-up dates) are frequently omitted or lost in fragmented paper charts or complex, legacy desktop EHRs.
3. **Medico-Legal Tampering Risks:** Unversioned digital notes allow retroactive alterations without auditable tracking, creating malpractice liabilities and clinical safety hazards.
4. **Disjointed Multi-Facility Practice:** Clinicians in emerging markets often consult across multiple independent hospitals, leading to duplicated records and disconnected care histories.
5. **Lack of Localized Healthcare Workflows:** Existing commercial EHRs are designed for Western billing systems (e.g. US ICD-10 billing codes) rather than the pragmatic clinical realities of Nigerian and African hospitals (such as PCV blood counts, manual triage acuity, and cash/HMO hybrid operations).

---

## 4. Intended Users and Stakeholders

| Stakeholder / Persona | Responsibilities & Clinical Context | Primary Workflow in CornerBrief |
| :--- | :--- | :--- |
| **Attending Doctor / Physician** | Conducts consultations, diagnoses conditions, reviews AI documentation, finalizes clinical records. | Consultation intake, NONYE AI review & edit, record locking, signing addenda. |
| **Ward / Triage Nurse** | Conducts patient intake, triage vitals recording, bedside surveillance, inpatient tracking. | Patient search, point-of-care vitals intake (BP, SpO2, Pulse, Temp, Glucose, PCV), nurse observations. |
| **Medical Records Staff** | Handles patient registration, MRN code allocation, demographic updates. | Patient registration modal, demographics, identity verification, status updates. |
| **Hospital / Facility Administrator** | Oversees hospital operations, department setup, staff credential provisioning. | Facility settings, department configuration, staff account provisioning and role assignment. |
| **Platform Super Administrator** | Supervises platform health, onboarding of new hospitals, system-wide audit monitoring. | Platform admin console, facility status management, platform-wide audit log monitoring. |

---

## 5. Product Goals and Measurable Success Criteria

* **Documentation Turnaround Reduction:** Reduce routine consultation charting time by >50% using NONYE AI structuring.
* **Zero Autonomous Hallucination:** Zero instances of AI-invented diagnoses, drug dosages, or fabricated lab vitals; 100% human-in-the-loop clinician verification before locking.
* **Tamper-Evident Integrity:** 100% of finalized encounters protected against silent modification, with complete chronological audit trail logging.
* **Operational Stability:** Point-of-care vital signs intake and patient history loading achievable in under 1 second on low-bandwidth clinic connections.

---

## 6. Existing Product Features and Workflows

```
┌────────────────────────────────────────────────────────────────────────┐
│ CLINICAL CONSULTATION WORKFLOW                                         │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Patient Selection/Registration (MRN, Demographics, Vitals History) │
│ 2. Point-of-Care Intake (Encounter Category, Structured Vitals, Notes) │
│ 3. AI Structuring (NONYE AI parses input into 9 structured domains)    │
│ 4. Human Clinician Review (Diffing, Editing, Missing Data Resolution)  │
│ 5. Record Locking & Finalization (Immutable Terminal State)            │
│ 6. Post-Finalization Addenda (Signed chronological addenda if needed)  │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Authentication & Portal Screen:** Facility tenant selector, Google OAuth popup button, and in-memory evaluation sandbox.
2. **Operations Dashboard:** Facility census KPIs, daily consultation totals, pending review queue, and quick-action navigation.
3. **Patient Registry & Profile:** Patient search by Name/MRN/Phone, status filtering (`Active`, `Follow-Up`, `Discharged`), and longitudinal encounter timeline.
4. **Point-of-Care Encounter Intake:** Multi-parameter vitals entry (BP, pulse, temperature, SpO2, weight, PCV, blood glucose), narrative complaint entry, and departmental classification.
5. **NONYE AI Review Workspace:** Structured note review (Encounter Summary, HPI, Relevant History, Medications, Allergies, Investigations, Clinician Observations, Plan, Missing Info flags), editing, and finalization.
6. **Encounters Register:** Filterable consultation archive grouped by lifecycle stage.
7. **Operational Reports:** Departmental workload charts, review velocity metrics, and audit event feed.
8. **Facility Settings & Staff Provisioning:** Department management, staff directory, and staff provisioning modal with role and temporary password generation.
9. **Platform Admin Console:** Multi-hospital registry, facility status toggling, and global audit log feed.
10. **Facility Registration Wizard:** 4-step guided onboarding modal for new hospitals.

---

## 7. NONYE AI's Role and Clinical Boundaries

### Role
NONYE AI functions strictly as an **organization, synthesis, and documentation assistant**. It translates rapid, unstructured clinician notes and telemetry into standardized medical documentation formats (Chief Complaint, Subjective Narrative, Objective Observations, Review of Systems, Care Plan).

### Mandatory Clinical Boundaries (Enforced by Prompt & Code)
1. **Never Invent Clinical Facts:** NONYE AI is strictly forbidden from extrapolating, guessing, or fabricating missing symptoms, lab findings, or medical history.
2. **Never Diagnose Autonomously:** It cannot assign disease diagnoses unless explicitly provided in the clinician's notes.
3. **No Autonomous Prescribing:** It cannot recommend drug dosages, treatment protocols, or pharmaceutical interventions.
4. **Explicit Omission Flags:** Any clinically standard section lacking explicit input must output `"Not provided."` and be flagged in `missingInformation`.
5. **Mandatory Human Sign-Off:** All AI-generated outputs are marked `status: 'Pending Review'` and `requiresReview: true`. Records cannot transition to `Finalized` without an authenticated clinician's action.

---

## 8. Functional Requirements Matrix

| ID | Requirement Statement | Status | Verification Method |
| :---: | :--- | :---: | :--- |
| **PRD-001** | System shall allow authenticated users to search patients by Name, MRN, or Phone. | **Implemented & Verified** | Live UI inspection in `PatientsView.tsx`. |
| **PRD-002** | System shall capture structured vital signs (BP systolic/diastolic, Pulse, Temp, SpO2, Weight, PCV, Blood Glucose). | **Implemented & Verified** | Code inspection in `NewEncounterView.tsx`. |
| **PRD-003** | System shall invoke Gemini API to organize clinical inputs into 9 standardized schema domains. | **Implemented & Verified** | Code inspection in `server.ts` (L221–390). |
| **PRD-004** | System shall validate AI output against a strict JSON schema before returning it to the client. | **Implemented & Verified** | Code inspection in `validateAiDocumentationSchema`. |
| **PRD-005** | System shall lock finalized clinical records from subsequent modification in Firestore. | **Implemented & Verified** | Static rules check in `firestore.rules` (L257–264). |
| **PRD-006** | System shall allow authenticated clinicians to append signed addenda to finalized encounters. | **Implemented & Verified** | Code inspection in `AiDocumentationView.tsx` (L1109). |
| **PRD-007** | System shall record immutable audit logs for all significant administrative and clinical events. | **Implemented & Verified** | Static rules check in `firestore.rules` (L269–277). |
| **PRD-008** | Facility Admins shall be able to provision staff accounts with temporary credentials. | **Partially Implemented** | Backend implemented; blocked by GCP IAM `roles/datastore.user`. |
| **PRD-009** | System shall prevent Facility Admins from provisioning PlatformAdmin or FacilityAdmin roles. | **Implemented & Verified** | Static check in `server.ts` (L802–835). |
| **PRD-010** | System shall support dedicated Hospital Code + Username + Password authentication. | **Not Implemented** | UI currently offers Google OAuth popup only. |
| **PRD-011** | Staff members shall be forced to change their temporary password upon first login. | **Partially Implemented** | Backend sets `mustChangePassword: true`; modal UI pending. |
| **PRD-012** | Doctors shall be able to hold memberships across multiple hospitals under one account. | **Not Implemented** | Current model binds 1 facility to 1 user document. |
| **PRD-013** | Platform Super Admins shall be barred from reading patient Protected Health Information (PHI). | **Not Implemented** | Current rules grant `isAdmin()` blanket read access. |
| **PRD-014** | Suspended staff accounts shall be immediately barred from querying Firestore records. | **Not Implemented** | Rules do not verify `status != 'Suspended'`. |
| **PRD-015** | Public self-registration shall be restricted from self-assigning Doctor or Nurse titles. | **Not Implemented** | Rules allow clinical roles on direct `create`. |

---

## 9. Non-Functional Requirements

### Security & Privacy
* **NFR-SEC-01 (Default Deny):** All Firestore paths must enforce default deny unless an explicit rule permits access.
* **NFR-SEC-02 (Cryptographic Authentication):** All server APIs must verify caller JWT signatures using Firebase Admin SDK.
* **NFR-SEC-03 (PHI Segregation):** Platform operations must be structurally segregated from patient clinical records.

### Reliability & Data Integrity
* **NFR-REL-01 (Fail-Closed Provisioning):** Any failure during database persistence or audit logging must immediately roll back newly created authentication accounts.
* **NFR-REL-02 (Deterministic AI Fallback):** If external AI services are unavailable or unconfigured, the system must organize clinical text using a deterministic local parser.

### Usability & Performance
* **NFR-USA-01 (Low-Bandwidth Optimization):** Client bundle size must remain under 2MB (currently 1.5MB minified); local state caching must allow charting during brief disconnections.
* **NFR-USA-02 (Zero-Pill UI Discipline):** The interface must use clear, accessible healthcare typography and high-contrast clinical tables.

---

## 10. User Roles and Intended Permissions

| Role | Intended Authorization Scope | Current Enforcement State |
| :--- | :--- | :--- |
| **PlatformAdmin** | Platform facility onboarding, global tenant status management, platform telemetry. **NO PHI access.** | Enforced on server; **Overprivileged in Firestore rules (can read all PHI)**. |
| **FacilityAdmin** | Hospital department configuration, staff provisioning, hospital profile updates, operational reports. | Enforced on server and in rules; restricted to assigned hospital. |
| **Doctor** | Patient consultation, point-of-care vitals intake, NONYE AI note structuring, record finalization, addenda. | Enforced in UI; **Blocked from colleagues' patients due to `ownerId` model**. |
| **Nurse** | Patient registration, triage vital signs capture, bedside notes, patient status updates. | Enforced in UI; **Blocked from colleagues' patients due to `ownerId` model**. |
| **RecordsStaff** | Patient registration, demographic editing, MRN allocation, clinic intake. | Enforced in UI. |
| **HR** | Staff directory maintenance, administrative personnel records. | Operational role defined in types; unassigned clinical features. |
| **Clinician** | General clinical practitioner with baseline consultation and documentation privileges. | Default hydrated role for verified staff. |

---

## 11. Facility Onboarding and Staff Account Requirements

* **Hospital Code Namespace:** Every facility must receive a unique short identifier (e.g. `CB-HQ`, `CB-LAGOS`).
* **Staff Credential Issuance:** Facility administrators provision accounts with temporary passwords; credentials must be scoped to the hospital code.
* **First-Login Policy:** Mandatory password change workflow before any patient record can be accessed.

---

## 12. Patient Management and Clinical Encounter Requirements

* **Unique Patient Identifier:** Each patient record must carry an immutable internal Patient ID / MRN (e.g. `CB-NG-1001`).
* **Encounter Categories:** Support for Outpatient Consult, Emergency Triage, Ward Rounds, Specialist Consult, and Routine Follow-Up.
* **Triage Vitals Capture:** Mandatory recording fields for systolic/diastolic blood pressure, pulse rate, temperature, SpO2, body weight, PCV, and blood glucose.

---

## 13. Clinical Documentation, Review, Finalization, and Addenda Requirements

* **Draft Encounters:** Clinicians must be able to save draft encounters without triggering AI structuring.
* **NONYE AI Review:** All AI-structured notes must present a clear review interface showing extracted history, medications, allergies, physical exam observations, and missing data flags.
* **Record Finalization Lock:** Finalizing an encounter permanently locks the original narrative, AI documentation, and reviewed documentation against modification.
* **Signed Clinical Addenda:** If clinical data must be updated after finalization, clinicians must submit a signed addendum containing author identity, timestamp, and addendum text.

---

## 14. Platform Administration Requirements

* **Tenant Lifecycle Management:** Platform Admins must be able to toggle hospital tenant status between `Active`, `Onboarding`, and `Suspended`.
* **Cross-Hospital Directory:** Read-only visibility into registered healthcare institutions and administrative contact emails.
* **Audit Trail Feed:** Platform-wide oversight of administrative provisioning and status changes without exposure to patient medical notes.

---

## 15. Known Limitations & Outstanding Requirements

1. **GCP IAM Blocker:** Firebase Admin SDK cannot write staff profiles to Firestore due to missing `roles/datastore.user` IAM permissions.
2. **Creator-Siloed Data Access:** Patients and encounters are locked to the creator's `ownerId`, preventing doctors from accessing records created by nurses or intake staff.
3. **Blanket Platform Admin PHI Exposure:** Platform Admins currently have unrestricted read access across all patient clinical records.
4. **Google OAuth Dependency:** Staff login is currently coupled to personal Google accounts rather than hospital-issued credentials.
5. **Absence of Financial/Billing Modules:** The platform currently lacks fee billing, invoice generation, or revenue tracking.

---

## 16. Acceptance Criteria for Proposed Improvements

* **AC-01 (IAM Unblocking):** Staff provisioning via `POST /api/admin/provision-staff` returns HTTP 201 with credentials; user profile is persisted in Firestore; audit log is recorded.
* **AC-02 (Hospital Tenancy):** A Doctor provisioned at Hospital A can read, update, and create encounters for all patients registered at Hospital A.
* **AC-03 (PHI Segregation):** Platform Admin querying `/patients` or `/encounters` receives `PERMISSION_DENIED`.
* **AC-04 (Hospital Credentials):** Staff member logs in using Hospital Code + Username + Password without Google OAuth popups.
* **AC-05 (Account Suspension):** Marking a user `'Suspended'` immediately prevents that user from querying any Firestore documents.

---

## 17. Product Roadmap and Dependencies

```
PHASE 1: Security & Infrastructure Foundations
  ├── P1: Grant GCP IAM `roles/datastore.user` on sodium-extension-px4wp
  ├── P2: Enforce account suspension in firestore.rules
  └── P3: Restrict public self-registration of clinical titles

PHASE 2: Enterprise Multi-Hospital Tenancy
  ├── P4: Introduce /memberships collection
  ├── P5: Transition firestore.rules from `ownerId` to hospital membership
  └── P6: Segregate Platform Admin from Patient PHI

PHASE 3: Hospital-Managed Authentication
  ├── P7: Implement Hospital Code + Username + Password Login Screen
  ├── P8: Enforce First-Login Mandatory Password Change Modal
  └── P9: Admin Password Reset Endpoint

PHASE 4: Clinical Expansion & Operational Modules
  ├── P10: Departmental patient queues and triage acuity scoring
  ├── P11: Co-signing for resident physicians and nurse handovers
  └── P12: Optional Medical Billing & Tariff Fee Schedule Engine (Corner LedgerAI)
```
