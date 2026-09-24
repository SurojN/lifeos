# Release review — 2026-09-24

This review hardens the existing MVP. It does not certify an issue-free production release. No production database migration or deployment was performed.

## Changes

- Private upload verification reads and hashes the actual bytes, checks size, declared MIME type, and file signature, and rejects forged metadata or oversized streams.
- Source deletion includes unconfirmed objects, refuses deletion while signed upload links remain active, and prevents concurrent confirmation from restoring deleted metadata. Medical confirmation rechecks and locks its source inside the transaction.
- Document downloads support Nepali/Unicode filenames without invalid HTTP headers.
- Optional, explicitly consented extraction reads real S3 streams and stores a fixed failure code instead of arbitrary provider error text.
- Upload forms validate before reading large files, prevent duplicate submission, preserve failed selections, lock inputs while uploading, and give section-appropriate success messages.
- Clerk retries failed/interrupted webhook deliveries and serializes concurrent replays.
- Next.js and its ESLint configuration are updated to 16.3.6. See the [maintainer security advisory](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j).

## Dependency maintenance

The Prisma CLI currently pins vulnerable transitive packages. Scoped overrides select `deepmerge-ts` 8.0.0 for `@prisma/config` and `mysql2` 3.24.4 for `prisma`, without downgrading Prisma or adopting its next prerelease. Prisma uses `deepmerge` for local config loading; LifeOS uses plain configuration objects rather than Map merging. Recheck and remove these overrides when upstream pins patched dependencies. Generation, migration status, and database tests must pass with the overrides.

Vitest is updated to 4.1.11 for its [mock redirect vulnerability fix](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9).

## Outstanding release gates

- Self-service permanent account erasure is not implemented. Soft deletion does not satisfy permanent deletion. A complete implementation must cover original objects, object versions, derived data, extraction results, identity synchronization, active requests, audit retention, retries, and backup policy.
- Files remain quarantined. Header/signature validation is not malware scanning.
- Abandoned or interrupted PUTs, storage versioning, replicas, and backups need an operational cleanup/retention policy.
- The full signed-in browser flow must run against staging with two test users and private object storage: upload → review → confirm → search/source download → correction → export → deletion, including cross-user denial.
- Verify production credentials, private-bucket policies/CORS/KMS permissions, pending migrations, and backup restoration before deployment.

## Repeatable checks

Run `npm run check` for lint, TypeScript, unit tests, and production compilation. Use `npm test -- --maxWorkers=2` on constrained machines. Run integration tests with a dedicated local `TEST_DATABASE_URL`, after applying migrations to that same isolated target. Never substitute application or production data.

Run `npm audit` when preparing a release; a clean result is time-specific and is not a security certification. `npm run build:release` also checks migration state against the explicitly selected release database.
