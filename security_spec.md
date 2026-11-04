# CareBrief Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Authentication & Verification**: All reads and writes require a signed-in user (`request.auth != null`) with `request.auth.token.email_verified == true`.
2. **Owner / Tenant Isolation**: Every document in `facilities`, `users`, `patients`, `encounters`, and `auditLogs` belongs to an `ownerId` matching `request.auth.uid` (or is accessed by a bootstrapped Admin). List queries must strictly filter by `resource.data.ownerId == request.auth.uid`.
3. **Strict Schema & Key Validation**: Every `create` and `update` must pass `isValid[Entity](incoming())` enforcing `hasAll`, `hasOnly`, string `.size()` limits, and regex ID checks (`isValidId`).
4. **Terminal State Lock on Finalized Encounters**: Once an encounter's `existing().status == 'Finalized'`, it cannot be overwritten by standard updates unless an Admin override is used, preventing silent overwriting of finalized clinical records.
5. **Immutable Audit Logs**: Documents in `/auditLogs/{logId}` can only be created (`allow create`), never updated or deleted (`allow update, delete: if false`).
6. **Immutability of Core Identifiers**: `id`, `ownerId`, and `createdAt` cannot be mutated during `update` operations.

## 2. The "Dirty Dozen" Payloads
1. **Unverified Email Spoof**: `{ auth: { uid: "u1", token: { email: "mervyndeanhilary@gmail.com", email_verified: false } } }` attempting to write to `/facilities/fac1`.
2. **Identity Spoofing on Patient Create**: Creating `/patients/p1` with `ownerId: "victim_uid"` while authenticated as `"attacker_uid"`.
3. **Shadow Field Injection on Patient Update**: Updating `/patients/p1` with an undeclared field `{ isVerified: true }`.
4. **Denial of Wallet Oversized String**: Creating `/patients/p1` with `notes` of length 10,000 characters (`> 2000`).
5. **Path ID Poisoning**: Creating `/patients/bad$id!@#` failing `isValidId()`.
6. **Silent Overwrite of Finalized Encounter**: Updating `/encounters/enc1` when `existing().status == 'Finalized'` as a non-admin user.
7. **Audit Log Tampering (Update)**: Attempting to update an existing `/auditLogs/log1` entry.
8. **Audit Log Deletion**: Attempting to delete `/auditLogs/log1`.
9. **Blanket List Scraping**: Listing `/patients` without `where('ownerId', '==', request.auth.uid)` (attempting to read records where `resource.data.ownerId != request.auth.uid`).
10. **PII Leak via Cross-User Get**: Authenticated user `u2` attempting `get` on `/users/u1` or `/patients/p_owned_by_u1`.
11. **Value Poisoning on Encounter Status**: Updating `/encounters/enc1` with `status: "HackedStatus"` outside the enum `['Draft', 'AI Generated', 'Pending Review', 'Reviewed', 'Finalized']`.
12. **Mutating Immutable Timestamp**: Updating `/patients/p1` with a modified `createdAt` timestamp.
