# Development setup

Requirements: Node.js 22+, PostgreSQL, a Clerk application, and MinIO with a private bucket. Copy `.env.example` to `.env.local`, replace every placeholder, and never commit the result.

## Where each environment value comes from

| Variable | Source |
| --- | --- |
| `DATABASE_URL` | A local PostgreSQL database you create; the default example expects database `lifeos` and user `lifeos`. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → your application → API keys. This is the only key intentionally exposed to the browser. |
| `NEXT_PUBLIC_CLERK_TELEMETRY_DISABLED` | Keep set to `true`. LifeOS disables Clerk SDK telemetry in both server and browser configuration. |
| `CLERK_SECRET_KEY` | The same Clerk API keys page. Server-only; never prefix it with `NEXT_PUBLIC_`. |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard → Webhooks → the LifeOS endpoint → Signing Secret. |
| `S3_*` | For local development, the MinIO endpoint, private bucket name, and MinIO access credentials. For production, use a least-privilege S3 identity. |
| `AWS_KMS_KEY_ID` | Required only when `STORAGE_PROVIDER=s3`; copy the KMS key ARN/ID authorized for the private bucket. |
| `APPLICATION_ENCRYPTION_KEY` | Generate locally with the command below. It cannot be recovered if lost, so keep a protected backup. |

Do not send keys in chat, commit `.env.local`, or reuse production credentials locally. AI extraction is optional and server-only. It requires explicit consent for each request, supports only the configured provider and currently supported document formats, stores output encrypted, and never creates a confirmed record without user review. The application remains fully usable without AI configuration.

For a hosted release, do not copy these local values. Follow the separate [production deployment guide](production-deployment.md) and use `.env.production.example` only as a variable-name checklist.

```bash
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Configure Clerk's webhook endpoint as `/api/webhooks/clerk` and subscribe to user created, updated, and deleted events. The endpoint rejects unsigned payloads and synchronizes only identity fields into the internal user record.

MinIO must use a private bucket with no anonymous policy. Production S3 additionally requires Block Public Access, SSE-KMS, bucket-policy TLS enforcement, and least-privilege credentials. This repository does not provision infrastructure.

Quality checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Known local limitation: protected upload routes require valid Clerk, PostgreSQL, private storage, encryption, and internal user mapping configuration. Uploads are categorized by LifeOS section and remain quarantined until future malware/content validation. Downloads are authenticated server responses; public and presigned download URLs are forbidden.

Generate the application-encryption key with `printf 'v1:'; openssl rand -base64 32`. Store it in a secret manager, never source control. See the security model before rotating it.

Real authorization integration tests require a separate local test database and refuse non-local URLs:

```bash
TEST_DATABASE_URL="postgresql://lifeos_test:password@127.0.0.1:5432/lifeos_test" \
DATABASE_URL="$TEST_DATABASE_URL" npx prisma db push

TEST_DATABASE_URL="postgresql://lifeos_test:password@127.0.0.1:5432/lifeos_test" \
npm run test:integration
```

Never point `TEST_DATABASE_URL` at a production or shared database. The integration suite deletes its test fixtures.

## Health-to-appointment milestone verification (2026-09-21)

Lint, TypeScript checking, all 63 unit tests, and the production build passed. Nine appointment-brief tests cover explicit selection, excluded records, duplicate/unknown IDs, stable ordering, missing fields, unavailable sources, literal text, and historical medicine labels.

A temporary local browser fixture mounted the real review and preparation components with synthetic records and stubbed network/router dependencies. It verified first-upload selection, clearing drafts on source changes, locking requests, preserving failed saves, isolating late extraction responses, and resetting successful submissions. It also verified that the downloadable text matches the preview, excluded records stay absent, unavailable originals have no download link, and brief generation makes no network request. Desktop and 390px mobile checks found no browser errors or horizontal overflow; the scrollable preview supports keyboard focus.

This is component verification, not a completed sign-in/storage/database integration test. The local Next.js browser check encountered a Clerk session-refresh redirect loop before the application rendered. Resolve the local authentication configuration and run the two-user acceptance scenario in [the roadmap](roadmap.md) against isolated test infrastructure before treating the workflow as ready for real medical records. No authentication bypass or test route was added to the application.
