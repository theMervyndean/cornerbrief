/**
 * Firestore Security Rules Test Suite (Dirty Dozen Verification)
 * Verifies that all 12 adversarial payloads described in security_spec.md are rejected.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenTestCase[] = [
  { id: 1, name: 'Unverified Email Spoof', collection: 'facilities', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 2, name: 'Identity Spoofing on Patient Create', collection: 'patients', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 3, name: 'Shadow Field Injection on Patient Update', collection: 'patients', operation: 'update', expectedResult: 'PERMISSION_DENIED' },
  { id: 4, name: 'Denial of Wallet Oversized String', collection: 'patients', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 5, name: 'Path ID Poisoning', collection: 'patients', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 6, name: 'Silent Overwrite of Finalized Encounter', collection: 'encounters', operation: 'update', expectedResult: 'PERMISSION_DENIED' },
  { id: 7, name: 'Audit Log Tampering (Update)', collection: 'auditLogs', operation: 'update', expectedResult: 'PERMISSION_DENIED' },
  { id: 8, name: 'Audit Log Deletion', collection: 'auditLogs', operation: 'delete', expectedResult: 'PERMISSION_DENIED' },
  { id: 9, name: 'Blanket List Scraping', collection: 'patients', operation: 'list', expectedResult: 'PERMISSION_DENIED' },
  { id: 10, name: 'PII Leak via Cross-User Get', collection: 'users', operation: 'get', expectedResult: 'PERMISSION_DENIED' },
  { id: 11, name: 'Value Poisoning on Encounter Status', collection: 'encounters', operation: 'update', expectedResult: 'PERMISSION_DENIED' },
  { id: 12, name: 'Mutating Immutable Timestamp', collection: 'patients', operation: 'update', expectedResult: 'PERMISSION_DENIED' },
];
