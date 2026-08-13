# Data classification

| Class | Examples | Handling |
|---|---|---|
| Restricted | Medical documents and records, identity documents, financial details, encryption keys | Least privilege, private storage, encryption, no raw logging, explicit deletion and retention rules |
| Confidential | Email, display name, life events, consent history, audit metadata | Authenticated internal-user scope, minimized logs, controlled export/deletion |
| Internal | Operational configuration without secrets, schema names, aggregate system health | Staff-only where practical; never combine into user profiling |
| Public | Landing-page copy and published policies | Safe for unauthenticated access |

Verification is independent of sensitivity. `UNVERIFIED` means imported or draft information has not been confirmed. `USER_CONFIRMED` means the owner reviewed it against its source. `PROFESSIONAL_VERIFIED` is reserved for a future evidence-backed workflow and must never be inferred from document appearance.

Clerk metadata must not contain restricted domain data, consent, ownership, or authorization state. Audit metadata must use identifiers and minimal operational context rather than medical contents.

## Database encryption map

| Encrypted application value | Operational plaintext retained |
|---|---|
| Source document original filename | ID, owner, storage key, MIME type, size, checksum, category and status |
| Medical title, summary, provider and structured data | ID, owner, source ID, record type, event date and verification state |
| Life-event title, description and metadata | ID, owner, source ID, category, occurrence date and verification state |

Encryption does not replace authorization, private object storage, TLS, database access controls, backups protection, or deletion policy.
