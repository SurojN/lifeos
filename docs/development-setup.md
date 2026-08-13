# Development setup

Requirements: Node.js 22+, PostgreSQL, a Clerk application, and MinIO with a private bucket. Copy `.env.example` to `.env.local`, replace every placeholder, and never commit the result.

## Where each environment value comes from

| Variable | Source |
| --- | --- |
| `DATABASE_URL` | A local PostgreSQL database you create; the default example expects database `lifeos` and user `lifeos`. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → your application → API keys. This is the only key intentionally exposed to the browser. |
| `CLERK_SECRET_KEY` | The same Clerk API keys page. Server-only; never prefix it with `NEXT_PUBLIC_`. |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard → Webhooks → the LifeOS endpoint → Signing Secret. |
| `S3_*` | For local development, the MinIO endpoint, private bucket name, and MinIO access credentials. For production, use a least-privilege S3 identity. |
| `AWS_KMS_KEY_ID` | Required only when `STORAGE_PROVIDER=s3`; copy the KMS key ARN/ID authorized for the private bucket. |
| `APPLICATION_ENCRYPTION_KEY` | Generate locally with the command below. It cannot be recovered if lost, so keep a protected backup. |

Do not send keys in chat, commit `.env.local`, or reuse production credentials locally. There is deliberately no AI provider key yet: AI extraction is not part of the trusted workflow until consent, redaction, retention, and review behavior are implemented. When that boundary is added, its key will be server-only and optional—the user-owned records will continue working without it.

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

Known local limitation: protected upload routes require valid Clerk, PostgreSQL, private storage, encryption, and internal user mapping configuration. Only presigned PUT upload is available; presigned downloads are forbidden in this phase.

Generate the application-encryption key with `printf 'v1:'; openssl rand -base64 32`. Store it in a secret manager, never source control. See the security model before rotating it.

Real authorization integration tests require a separate local test database and refuse non-local URLs:

```bash
TEST_DATABASE_URL="postgresql://lifeos_test:password@127.0.0.1:5432/lifeos_test" \
DATABASE_URL="$TEST_DATABASE_URL" npx prisma db push

TEST_DATABASE_URL="postgresql://lifeos_test:password@127.0.0.1:5432/lifeos_test" \
npm run test:integration
```

Never point `TEST_DATABASE_URL` at a production or shared database. The integration suite deletes its test fixtures.
