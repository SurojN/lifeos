# Security model

## Trust boundaries

- The browser is untrusted for identity, user IDs, storage keys, verification state, and authorization decisions.
- Clerk is trusted only to authenticate an external identity and maintain its session.
- LifeOS maps that identity to an active internal user and authorizes every personal-data operation with the internal ID.
- PostgreSQL stores ownership and metadata; the private object store holds original document bytes.
- Server code and deployment secrets form a privileged boundary. Secrets never use `NEXT_PUBLIC_` except Clerk's publishable key.

Authentication does not imply resource authorization. Queries for user-owned data include both the resource ID and authenticated internal user ID. Missing mappings fail closed. UI visibility never substitutes for server authorization.

Audit records are created server-side, append-only at the application layer, and exclude raw documents and unnecessary medical values. Responses suppress stack traces and return the same not-found result for missing and foreign resources.

Sensitive database values use versioned AES-256-GCM authenticated encryption with a new 96-bit random nonce for every value. Encrypted columns are explicitly named `*Encrypted`. Operational fields required for ownership and workflows—IDs, `userId`, statuses, dates, MIME type, byte size, checksum and storage key—remain plaintext. Storage keys are server-only capability metadata and are never returned by public document repositories.

`APPLICATION_ENCRYPTION_KEY` uses `version:base64-key` format. New writes use its version. During rotation, older keys are supplied through `APPLICATION_ENCRYPTION_PREVIOUS_KEYS`, new writes switch to the new version, existing rows are re-encrypted in controlled batches, and the old key is removed only after an inventory confirms no ciphertext uses it. Losing every key for a stored version makes that data unrecoverable.

Audit writes are required. Reads are returned only after their success audit is stored. Mutation audit failures return a service error rather than claiming success; current non-transactional legacy service mutations may already have occurred, so production alerting and reconciliation are required. Upload mutations and their success audits use database transactions. Denied audits contain only actor/owner IDs, action, resource type/ID, result, and a non-sensitive reason code.

Storage uses private buckets, server-generated prefixes, MIME and size validation, SHA-256 checksums, and short upload authorization lifetimes. Production S3 requires an AWS KMS key; infrastructure must additionally block all public access and enforce least-privilege IAM.

Clerk webhooks are signature-verified before database access. A persistent ledger uniquely identifies `(provider, externalEventId)`, stores no payload, and transactionally associates the identity mutation with `PROCESSED`. Replays return success without repeating the mutation. Failures retain only a minimal failure code.
