# Data classification

| Class | Examples | Handling |
|---|---|---|
| Restricted | Medical documents and records, identity documents, financial details, encryption keys | Least privilege, private storage, encryption, no raw logging, explicit deletion and retention rules |
| Confidential | Email, display name, life events, consent history, audit metadata | Authenticated internal-user scope, minimized logs, controlled export/deletion |
| Internal | Operational configuration without secrets, schema names, aggregate system health | Staff-only where practical; never combine into user profiling |
| Public | Landing-page copy and published policies | Safe for unauthenticated access |

Verification is independent of sensitivity. `UNVERIFIED` means imported or draft information has not been confirmed. `USER_CONFIRMED` means the owner reviewed it against its source. `PROFESSIONAL_VERIFIED` is reserved for a future evidence-backed workflow and must never be inferred from document appearance.

Clerk metadata must not contain restricted domain data, consent, ownership, or authorization state. Audit metadata must use identifiers and minimal operational context rather than medical contents.
