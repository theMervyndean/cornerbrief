# CornerBrief — External Technical Support & Mentorship Request

**Document Identifier:** CB-OUTREACH-V1.0  
**Project Name:** CornerBrief  
**Embedded AI Assistant:** NONYE AI  
**Author / Lead:** Mervyn Dean Hilary (`mervyndeanhilary@gmail.com`)  
**Development Platform:** Google AI Studio Build  
**Audience:** Google AI Studio Trainers (Tymon and Shai), Technical Mentors, Healthcare Technology Collaborators  
**Date:** October 2026  

---

## Executive Outreach Brief

**Subject:** Technical Review & Infrastructure Guidance Request: CornerBrief Healthcare Platform (Built on Google AI Studio)

**Recipient:** Tymon, Shai, Google AI Studio Engineering Mentors & Technical Collaborators  
**From:** Mervyn Dean Hilary (`mervyndeanhilary@gmail.com`)  
**Applet ID:** `3a5f4224-3c34-41c4-ba6c-41b73bdfc6dc`  
**Host URL:** `https://ais-dev-2lmibzlcblr4gj4hfdoxra-900563531568.europe-west2.run.app`

---

### 1. Introduction & Background
Following my training on Google AI Studio with Tymon and Shai, I developed **CornerBrief**, a clinical workflow and electronic health records platform tailored for hospitals and medical clinics in emerging markets (with specialized operational features for Nigerian healthcare institutions). The platform embeds **NONYE AI**, an AI-assisted clinical documentation engine built with the `@google/genai` TypeScript SDK.

I have completed a thorough, read-only architectural audit, security verification matrix, and technical requirements analysis of the existing codebase. I am reaching out to share our verified progress and request targeted technical assistance on our core infrastructure and authorization boundaries.

---

### 2. What Has Been Built and Validated

1. **NONYE AI Structured Documentation Pipeline:**
   * Integrated Google Gemini (`gemini-2.5-flash`) via `@google/genai` with strict medical-legal prompt guardrails prohibiting autonomous drug dosing or disease guessing.
   * Enforced strict 9-section JSON schema validation (`validateAiDocumentationSchema`) with deterministic fallback when API keys are unconfigured.
2. **Point-of-Care Triage Vitals:**
   * Built structured inputs for physiological parameters: Blood Pressure (systolic/diastolic), Pulse Rate, Temperature, SpO2, Body Weight, Packed Cell Volume (PCV), and Blood Glucose.
3. **Medical Record Finalization & Addenda:**
   * Enforced terminal state record locking in `firestore.rules` preventing finalized consultations from being altered, while allowing authenticated clinicians to append signed clinical addenda.
4. **Server-Side Token Cryptography & Authority Verification:**
   * Implemented cryptographic Firebase ID token verification and independent role checks in Express that independently verify administrative standing and demote unverified elevated roles.
5. **Fail-Closed Staff Provisioning:**
   * Implemented an automated rollback mechanism that prevents orphaned Firebase Authentication accounts if database persistence fails.

---

### 3. The Core Technical & Infrastructure Constraint

In implementing server-side staff provisioning via the Firebase Admin SDK, we encountered a cross-project Google Cloud IAM boundary:
* **Application Host Environment:** Cloud Run in Google Cloud project `ais-europe-west2-ebd5a75edac54` (`900563531568`) using runtime service account `ais-sandbox@ais-europe-west2-ebd5a75edac54.iam.gserviceaccount.com`.
* **Database & Auth Project:** Google Cloud project `sodium-extension-px4wp` (`758062022045`), using a dedicated named Firestore database `ai-studio-carebrief-3a5f4224-3c34-41c4-ba6c-41b73bdfc6dc`.
* **Observed Error:** The Firebase Admin SDK receives `7 PERMISSION_DENIED: Missing or insufficient permissions.` because the Cloud Run service account lacks `roles/datastore.user` on project `sodium-extension-px4wp`.
* **Current Operational State:** The server correctly fails closed: it deletes the temporary Firebase Auth account, records no incomplete data, and returns HTTP 502.

---

### 4. Specific Technical Assistance Requested

1. **GCP IAM Policy Binding Guidance:**
   * We have drafted the exact least-privilege conditional IAM command to bind `roles/datastore.user` to `ais-sandbox@...` scoped strictly to `databases/ai-studio-carebrief...`. We would appreciate review and administrative execution of this binding to unblock staff provisioning.
2. **Multi-Hospital Tenancy Architecture:**
   * Our existing database rules use an owner-centric model (`existing().ownerId == request.auth.uid`), which prevents doctors from reading patient records registered by hospital intake staff or colleagues.
   * We are preparing to transition to an enterprise `/memberships` model. We would welcome architectural feedback from Google engineers on structuring multi-tenant Firestore security rules for healthcare institutions.
3. **Hospital-Managed Authentication Model:**
   * We are seeking guidance on transitioning from personal Google OAuth popups to an institutional [Hospital Code + Staff Username + Password] login model using Firebase Auth Custom Tokens or Email/Password mapping.

---

### 5. Documentation Package Available for Review

I have prepared a complete Google NotebookLM project dossier containing:
* `CornerBrief_PRD.md` (Product Requirements Document)
* `CornerBrief_TRD.md` (Technical Requirements Document)
* `CornerBrief_Documentation_Evidence_Register.md` (Traceability Matrix with live cURL & build evidence)
* `CornerBrief_Resource_Constraints_and_NotebookLM_Guide.md` (GCP IAM analysis and NotebookLM guide)

Thank you for your guidance, mentorship, and support as we build CornerBrief into a robust, compliant platform for healthcare institutions.

Warm regards,  
**Mervyn Dean Hilary**  
Creator of CornerBrief  
`mervyndeanhilary@gmail.com`
