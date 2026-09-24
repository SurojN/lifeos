# Security model

## Trust boundaries

- The browser is untrusted for identity, user IDs, storage keys, verification state, and authorization decisions.
- Clerk is trusted only to authenticate an external identity and maintain its session.
- LifeOS maps that identity to an active internal user and authorizes every personal-data operation with the internal ID.
- PostgreSQL stores ownership and metadata; the private object store holds original document bytes.
- Server code and deployment secrets form a privileged boundary. Secrets never use `NEXT_PUBLIC_` except Clerk's publishable key.

Authentication does not imply resource authorization. Queries for user-owned data include both the resource ID and authenticated internal user ID. Missing mappings fail closed. UI visibility never substitutes for server authorization.

Clerk SDK telemetry is disabled in the application provider and process configuration. LifeOS does not add analytics, advertising SDKs, session replay, or product telemetry.

Audit records are created server-side, append-only at the application layer, and exclude raw documents and unnecessary medical values. Responses suppress stack traces and return the same not-found result for missing and foreign resources.

Sensitive database values use versioned AES-256-GCM authenticated encryption with a new 96-bit random nonce for every value. Encrypted columns are explicitly named `*Encrypted`. Operational fields required for ownership and workflows—IDs, `userId`, statuses, dates, MIME type, byte size, checksum and storage key—remain plaintext. Storage keys are server-only capability metadata and are never returned by public document repositories.

`APPLICATION_ENCRYPTION_KEY` uses `version:base64-key` format. New writes use its version. During rotation, older keys are supplied through `APPLICATION_ENCRYPTION_PREVIOUS_KEYS`, new writes switch to the new version, existing rows are re-encrypted in controlled batches, and the old key is removed only after an inventory confirms no ciphertext uses it. Losing every key for a stored version makes that data unrecoverable.

Audit writes are required. Reads are returned only after their success audit is stored. Mutation audit failures return a service error rather than claiming success; current non-transactional legacy service mutations may already have occurred, so production alerting and reconciliation are required. Upload mutations and their success audits use database transactions. Denied audits contain only actor/owner IDs, action, resource type/ID, result, and a non-sensitive reason code.

Storage uses private buckets, server-generated prefixes, MIME and size validation, SHA-256 checksums, category-aware uploads, and short upload authorization lifetimes. Production S3 requires an AWS KMS key; infrastructure must additionally block all public access and enforce least-privilege IAM. Owner deletion removes the private object when present and soft-deletes its source metadata so confirmed derived facts retain their audit history without retaining an accessible original.

Upload confirmation now reads the object with a bounded stream, checks its declared MIME type and file signature, and computes SHA-256 from its bytes. Client-supplied object metadata is not evidence of a matching checksum. Signature checks do not constitute malware scanning or prove that an entire PDF/image is well formed; files remain quarantined. Downloads are attachments and support Unicode filenames, including Nepali.

Source deletion waits until every issued upload link for that source expires, then attempts object deletion even for uploads that were never confirmed. Confirmation conditionally updates only an active pending source; it cannot restore a deleted source. A PUT already in progress at expiration, abandoned uploads, versioned-bucket history, replicas, and backups still require an infrastructure retention/cleanup policy. This is not a complete permanent-account-erasure workflow. Self-service permanent account deletion remains a release blocker.

AI extraction is disabled unless all server-side AI settings are configured. Each extraction request requires explicit consent, creates an audit record, sends only the selected user-owned document, and stores structured results encrypted. Model output is treated as untrusted and unverified: it cannot create medical records or timeline events without the existing user confirmation transaction. Raw prompts, document bytes, and model responses are not written to audit metadata. Provider failures produce a failed job rather than an empty or fabricated result.

Clerk webhooks are signature-verified before database access. A persistent ledger uniquely identifies `(provider, externalEventId)`, stores no payload, and transactionally associates the identity mutation with `PROCESSED`. Replays return success without repeating the mutation. Failures retain only a minimal failure code.

Only `PROCESSED` webhook deliveries are acknowledged as duplicates. Failed/interrupted deliveries can retry; a conditional ledger update inside the identity transaction serializes concurrent deliveries. Medical extraction failures likewise persist a fixed failure code instead of arbitrary provider exception text.
