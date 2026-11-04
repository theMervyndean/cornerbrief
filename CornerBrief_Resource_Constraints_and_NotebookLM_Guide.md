# CornerBrief — Resource Constraints, Support Requirements & NotebookLM Guide

**Document Identifier:** CB-GUIDE-V1.0  
**Project Name:** CornerBrief  
**Embedded AI Assistant:** NONYE AI  
**Author / Lead:** Mervyn Dean Hilary (`mervyndeanhilary@gmail.com`)  
**Development Platform:** Google AI Studio Build  
**Date:** October 2026  

---

## 1. Resource Constraints & Infrastructure Support Package

### Observed Infrastructure Error
When the CornerBrief server (`server.ts`) attempts to persist a provisioned staff account using the Firebase Admin SDK (`adminDb.collection('users').doc(newUid).set()`), the gRPC client throws:
```
Error: 7 PERMISSION_DENIED: Missing or insufficient permissions.
    at callErrorFromStatus (/app/applet/node_modules/google-gax/node_modules/@grpc/grpc-js/build/src/call.js:32:19)
    ...
```
A direct HTTP probe to the Firestore REST API using the server's Application Default Credentials (ADC) OAuth token confirmed:
```json
{
  "error": {
    "code": 403,
    "message": "Missing or insufficient permissions.",
    "status": "PERMISSION_DENIED"
  }
}
```

### Documented Impact
1. **Staff Provisioning Failure:** Hospital administrators cannot provision staff accounts via `POST /api/admin/provision-staff`.
2. **Fail-Closed Rollback Activated:** Because CornerBrief is built with fail-closed security guarantees, the server catches the error, deletes the newly created Firebase Auth account via `adminAuth.deleteUser()`, and returns HTTP 502 with:
   `"Failed to persist staff profile in database. Provisioning was aborted and credentials rolled back."`
3. **No Orphaned Accounts:** No orphaned credentials or partial profiles are left behind, but legitimate hospital onboarding cannot complete.

### Confirmed Technical Root Cause
* **Application Host Environment:** Cloud Run in Google Cloud project `ais-europe-west2-ebd5a75edac54` (Project Number: `900563531568`).
* **Active Runtime Service Account:** `ais-sandbox@ais-europe-west2-ebd5a75edac54.iam.gserviceaccount.com` (Unique ID: `117367076711668642210`).
* **Target Firestore Database:** Dedicated named database `ai-studio-carebrief-3a5f4224-3c34-41c4-ba6c-41b73bdfc6dc` hosted in Google Cloud project `sodium-extension-px4wp` (Project Number: `758062022045`).
* **Root Cause:** The Cloud Run runtime service account in project `900563531568` has not been granted Google Cloud IAM permissions (`roles/datastore.user`) on target project `sodium-extension-px4wp`.

### Action Required by Authorized Google Cloud Administrator
An administrator with `resourcemanager.projects.setIamPolicy` on project `sodium-extension-px4wp` must execute the following least-privilege conditional binding:

```bash
gcloud projects add-iam-policy-binding sodium-extension-px4wp \
    --member="serviceAccount:ais-sandbox@ais-europe-west2-ebd5a75edac54.iam.gserviceaccount.com" \
    --role="roles/datastore.user" \
    --condition='expression=resource.name == "projects/sodium-extension-px4wp/databases/ai-studio-carebrief-3a5f4224-3c34-41c4-ba6c-41b73bdfc6dc",title="CornerBrief Named DB Access",description="Grants Datastore User role strictly to CornerBrief database"'
```

---

## 2. Google NotebookLM Source Structure Guide

To assemble the complete project notebook in Google NotebookLM, upload the following documents in order:

```
GOOGLE NOTEBOOKLM PROJECT NOTEBOOK: "CornerBrief Technical & Product Dossier"
├── Source 1: CornerBrief_PRD.md
│   └── Executive summary, healthcare problems, NONYE AI clinical boundaries, functional requirements PRD-001 to PRD-015.
│
├── Source 2: CornerBrief_TRD.md
│   └── Architecture diagrams, Express API routes, Firestore schemas, security rules, Cloud Run deployment, TRD-001 to TRD-007.
│
├── Source 3: CornerBrief_Documentation_Evidence_Register.md
│   └── Traceability matrix, live curl test outputs, build outputs, linting evidence, EV-01 to EV-19.
│
├── Source 4: CornerBrief_Resource_Constraints_and_NotebookLM_Guide.md
│   └── Cross-project GCP IAM blocker analysis, gcloud remediation command, NotebookLM guide.
│
└── Source 5: CornerBrief_External_Support_Request.md
    └── Outreach brief to Google AI Studio trainers (Tymon and Shai), technical mentors, and collaborators.
```

---

## 3. Visual Documentation & Application Screenshot Checklist

To visually support the notebook and presentations, capture the following 8 actual screens from the running development application:

| Screen # | Component / Route | What It Visually Demonstrates | Key Clinical Elements to Highlight |
| :-: | :--- | :--- | :--- |
| **01** | `LoginScreen.tsx` | Clinical Portal & Hospital Selection | Hospital tenant dropdown, educational hospital activity carousel (Emergency, Ward Rounds, Surgery, Outpatient). |
| **02** | `DashboardView.tsx` | Hospital Operational Census | KPI metric cards (Active Patients, Consultations, Pending Reviews), recent encounter activity feed. |
| **03** | `PatientsView.tsx` | Patient Search & Medical Records | Search bar filtering by MRN/Name/Phone, clinical status badges (`Active`, `Follow-Up`, `Discharged`). |
| **04** | `NewEncounterView.tsx` | Point-of-Care Vitals Intake | Triage vital signs inputs: Blood Pressure (systolic/diastolic), Pulse, Temp, SpO2, Weight, PCV, Blood Glucose. |
| **05** | `AiDocumentationView.tsx` | NONYE AI Structured Review Workspace | Side-by-side view of unstructured clinician narrative vs. Gemini structured 9-domain medical output with missing data flags. |
| **06** | `AiDocumentationView.tsx` | Finalized Encounter & Signed Addenda | Locked clinical note indicator (preventing tampering) and signed post-finalization clinical addendum card. |
| **07** | `PatientProfileView.tsx` | Longitudinal Patient History | Chronological visit timeline, emergency contacts, and demographic summary header. |
| **08** | `SettingsView.tsx` | Staff Provisioning & Hospital Config | Department configuration list, staff directory table, and staff account provisioning modal with temporary password field. |
