/**
 * Firestore Security Rules Test Specification (Dirty Dozen Verification)
 */
export const DIRTY_DOZEN_TESTS = [
  { id: 1, name: 'Unauthenticated Create', expected: 'PERMISSION_DENIED' },
  { id: 2, name: 'Unverified Email Create', expected: 'PERMISSION_DENIED' },
  { id: 3, name: 'Identity Spoofing on Thread', expected: 'PERMISSION_DENIED' },
  { id: 4, name: 'Shadow Field Injection on Thread Create', expected: 'PERMISSION_DENIED' },
  { id: 5, name: 'Title Overflow (Resource Poisoning)', expected: 'PERMISSION_DENIED' },
  { id: 6, name: 'Invalid Enum on Reasoning Effort', expected: 'PERMISSION_DENIED' },
  { id: 7, name: 'Forged Client Timestamp', expected: 'PERMISSION_DENIED' },
  { id: 8, name: 'Mutating Immutable OwnerId', expected: 'PERMISSION_DENIED' },
  { id: 9, name: 'Shadow Field Injection on Thread Update', expected: 'PERMISSION_DENIED' },
  { id: 10, name: 'Orphaned Subcollection Message', expected: 'PERMISSION_DENIED' },
  { id: 11, name: 'Cross-Tenant Message Injection', expected: 'PERMISSION_DENIED' },
  { id: 12, name: 'Cross-Tenant Thread Listing', expected: 'PERMISSION_DENIED' },
];
