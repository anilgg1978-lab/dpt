# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Default-Deny Catch-All**: Any path not explicitly matched is denied for both read and write.
2. **Verified Authentication**: All writes and reads require `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Thread Ownership**: A `ChatThread` (`/threads/{threadId}`) can only be created, read, listed, updated, or deleted if `ownerId == request.auth.uid`.
4. **Relational Master Gate for Messages**: A `ChatMessage` (`/threads/{threadId}/messages/{messageId}`) can only be created, read, or deleted if the parent `/threads/$(threadId)` exists and its `ownerId == request.auth.uid`, and `incoming().threadId == threadId` and `incoming().ownerId == request.auth.uid`.
5. **Strict Key & Size Enforcement**: Every string has `.size()` bounds matching `firebase-blueprint.json`, and `hasOnly` / `hasAll` key checks block shadow fields.
6. **Temporal & Immutable Integrity**: `createdAt == request.time`, `updatedAt == request.time`, and `ownerId` / `createdAt` are immutable on update.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Create**: Creating `/threads/t1` with `auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Create**: Creating `/threads/t1` with `email_verified == false` -> `PERMISSION_DENIED`.
3. **Identity Spoofing on Thread**: Creating `/threads/t1` where `ownerId != request.auth.uid` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Thread Create**: Including `isAdmin: true` in `/threads/t1` -> `PERMISSION_DENIED`.
5. **Title Overflow (Resource Poisoning)**: Creating `/threads/t1` with `title.size() > 200` -> `PERMISSION_DENIED`.
6. **Invalid Enum on Reasoning Effort**: Setting `reasoningEffort: "UltraExtreme"` -> `PERMISSION_DENIED`.
7. **Forged Client Timestamp**: Creating `/threads/t1` with `createdAt != request.time` -> `PERMISSION_DENIED`.
8. **Mutating Immutable OwnerId**: Updating `/threads/t1` to change `ownerId` -> `PERMISSION_DENIED`.
9. **Shadow Field Injection on Thread Update**: Updating `/threads/t1` with an unapproved field -> `PERMISSION_DENIED`.
10. **Orphaned Subcollection Message**: Creating `/threads/nonexistent/messages/m1` where parent thread does not exist -> `PERMISSION_DENIED`.
11. **Cross-Tenant Message Injection**: Creating `/threads/otherUserThread/messages/m1` where parent thread belongs to another user -> `PERMISSION_DENIED`.
12. **Cross-Tenant Thread Listing**: Listing `/threads` without filtering `resource.data.ownerId == request.auth.uid` -> `PERMISSION_DENIED`.
